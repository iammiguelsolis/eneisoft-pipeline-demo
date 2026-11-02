#!/usr/bin/env bash
# ═════════════════════════════════════════════════════════════════════════════
# ENEISOFT XVI – Provisionamiento de Infraestructura en Azure
# "Del git push a la nube: Construye tu primer pipeline automatizado"
#
# Este script aprovisiona de forma idempotente:
# 1. Resource Group
# 2. Azure Container Registry (SKU Basic)
# 3. Azure Kubernetes Service (Tier Free, 1 nodo económico, con ACR adjunto)
# 4. Azure AD App Registration + Service Principal + Federated Credential (OIDC)
# 5. Role Assignments (AcrPush + AKS Access)
# 6. Imprime los Secrets y Variables para GitHub Actions
# ═════════════════════════════════════════════════════════════════════════════

set -euo pipefail

# ── Variables de Configuración (Personaliza según tu suscripción) ────────────
LOCATION="${LOCATION:-eastus2}"                  # Región con buena cuota y bajo costo
RESOURCE_GROUP="${RESOURCE_GROUP:-rg-eneisoft-demo}"
# El nombre de ACR debe ser alfanumérico globalmente único, 5-50 caracteres:
RAND_SUFFIX=$(head /dev/urandom | tr -dc a-z0-9 | head -c 4 2>/dev/null || echo "demo")
ACR_NAME="${ACR_NAME:-acreneisoft${RAND_SUFFIX}}"
AKS_NAME="${AKS_NAME:-aks-eneisoft-demo}"
# Standard_B2s (2 vCPU, 4GB RAM) es ideal para demos. Alternativa si falta cuota: Standard_D2s_v5 o Standard_B2als_v2
AKS_VM_SIZE="${AKS_VM_SIZE:-Standard_B2s}"
APP_REG_NAME="${APP_REG_NAME:-sp-github-eneisoft-demo}"

# Identificador de GitHub para el Federated Credential (OIDC)
GITHUB_ORG="${GITHUB_ORG:-<TU_USUARIO_O_ORG>}"
GITHUB_REPO="${GITHUB_REPO:-eneisoft-pipeline-demo}"

echo "=========================================================================="
echo " Inicios del aprovisionamiento para ENEISOFT XVI Demo"
echo " Ubicación:        ${LOCATION}"
echo " Resource Group:   ${RESOURCE_GROUP}"
echo " ACR:              ${ACR_NAME}"
echo " AKS:              ${AKS_NAME} (VM: ${AKS_VM_SIZE})"
echo " Repositorio:      ${GITHUB_ORG}/${GITHUB_REPO}"
echo "=========================================================================="

# 0. Obtener ID de Suscripción y Tenant activos
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
TENANT_ID=$(az account show --query tenantId -o tsv)
echo "✓ Suscripción activa: ${SUBSCRIPTION_ID}"
echo "✓ Tenant ID:          ${TENANT_ID}"

# 1. Resource Group
echo "--> Paso 1/5: Creando/verificando Resource Group..."
az group create \
  --name "${RESOURCE_GROUP}" \
  --location "${LOCATION}" \
  --tags Purpose=ENEISOFT-Demo Track=DevOps \
  -o none
echo "✓ Resource Group '${RESOURCE_GROUP}' listo."

# 2. Azure Container Registry (Basic)
echo "--> Paso 2/5: Creando/verificando Azure Container Registry (ACR)..."
if ! az acr show --name "${ACR_NAME}" --resource-group "${RESOURCE_GROUP}" &>/dev/null; then
  az acr create \
    --resource-group "${RESOURCE_GROUP}" \
    --name "${ACR_NAME}" \
    --sku Basic \
    --admin-enabled false \
    -o none
  echo "✓ ACR '${ACR_NAME}' creado exitosamente."
else
  echo "✓ ACR '${ACR_NAME}' ya existe."
fi
ACR_ID=$(az acr show --name "${ACR_NAME}" --resource-group "${RESOURCE_GROUP}" --query id -o tsv)

# 3. Azure Kubernetes Service (AKS)
echo "--> Paso 3/5: Creando/verificando AKS (Tier Free, 1 nodo)..."
if ! az aks show --name "${AKS_NAME}" --resource-group "${RESOURCE_GROUP}" &>/dev/null; then
  echo "  (Nota: la creación de AKS tarda entre 4 a 6 minutos)..."
  az aks create \
    --resource-group "${RESOURCE_GROUP}" \
    --name "${AKS_NAME}" \
    --tier free \
    --node-count 1 \
    --node-vm-size "${AKS_VM_SIZE}" \
    --attach-acr "${ACR_NAME}" \
    --enable-managed-identity \
    --generate-ssh-keys \
    -o none
  echo "✓ AKS '${AKS_NAME}' creado y vinculado con ACR '${ACR_NAME}'."
else
  echo "✓ AKS '${AKS_NAME}' ya existe."
  # Asegurar que esté vinculado al ACR
  az aks update --resource-group "${RESOURCE_GROUP}" --name "${AKS_NAME}" --attach-acr "${ACR_NAME}" -o none 2>/dev/null || true
fi
AKS_ID=$(az aks show --name "${AKS_NAME}" --resource-group "${RESOURCE_GROUP}" --query id -o tsv)

# 4. App Registration + Service Principal + OIDC Federated Credentials
echo "--> Paso 4/5: Configurando Entra ID App y OIDC para GitHub Actions..."
APP_ID=$(az ad app list --display-name "${APP_REG_NAME}" --query "[0].appId" -o tsv || true)

if [ -z "${APP_ID}" ]; then
  APP_ID=$(az ad app create --display-name "${APP_REG_NAME}" --query appId -o tsv)
  echo "✓ App Registration creada: ${APP_ID}"
  az ad sp create --id "${APP_ID}" -o none
  echo "✓ Service Principal asociado creado."
else
  echo "✓ App Registration existente: ${APP_ID}"
fi

# Configurar Federated Credential para la rama 'main'
FED_NAME_MAIN="github-actions-main"
if ! az ad app federated-credential list --id "${APP_ID}" --query "[?name=='${FED_NAME_MAIN}'].name" -o tsv | grep -q "${FED_NAME_MAIN}"; then
  az ad app federated-credential create \
    --id "${APP_ID}" \
    --parameters "{
      \"name\": \"${FED_NAME_MAIN}\",
      \"issuer\": \"https://token.actions.githubusercontent.com\",
      \"subject\": \"repo:${GITHUB_ORG}/${GITHUB_REPO}:ref:refs/heads/main\",
      \"description\": \"GitHub Actions OIDC branch main\",
      \"audiences\": [\"api://AzureADTokenExchange\"]
    }" -o none
  echo "✓ Credencial federada para rama 'main' configurada."
fi

# Configurar Federated Credential para el entorno de GitHub 'production'
FED_NAME_ENV="github-actions-env-prod"
if ! az ad app federated-credential list --id "${APP_ID}" --query "[?name=='${FED_NAME_ENV}'].name" -o tsv | grep -q "${FED_NAME_ENV}"; then
  az ad app federated-credential create \
    --id "${APP_ID}" \
    --parameters "{
      \"name\": \"${FED_NAME_ENV}\",
      \"issuer\": \"https://token.actions.githubusercontent.com\",
      \"subject\": \"repo:${GITHUB_ORG}/${GITHUB_REPO}:environment:production\",
      \"description\": \"GitHub Actions OIDC environment production\",
      \"audiences\": [\"api://AzureADTokenExchange\"]
    }" -o none
  echo "✓ Credencial federada para entorno 'production' configurada."
fi

# 5. Role Assignments
echo "--> Paso 5/5: Asignando roles de seguridad al Service Principal..."
SP_OBJECT_ID=$(az ad sp show --id "${APP_ID}" --query id -o tsv)

# Rol 1: AcrPush sobre el ACR
az role assignment create \
  --assignee-object-id "${SP_OBJECT_ID}" \
  --assignee-principal-type ServicePrincipal \
  --role "AcrPush" \
  --scope "${ACR_ID}" -o none 2>/dev/null || true
echo "✓ Rol 'AcrPush' asignado sobre ACR."

# Rol 2: Azure Kubernetes Service Cluster User (permite descargar credenciales con az aks get-credentials)
az role assignment create \
  --assignee-object-id "${SP_OBJECT_ID}" \
  --assignee-principal-type ServicePrincipal \
  --role "Azure Kubernetes Service Cluster User Role" \
  --scope "${AKS_ID}" -o none 2>/dev/null || true

# Rol 3: Azure Kubernetes Service RBAC Cluster Admin (para aplicar manifiestos y crear namespaces en AKS)
az role assignment create \
  --assignee-object-id "${SP_OBJECT_ID}" \
  --assignee-principal-type ServicePrincipal \
  --role "Azure Kubernetes Service RBAC Cluster Admin" \
  --scope "${AKS_ID}" -o none 2>/dev/null || true

# Rol 4: Contributor sobre el AKS (para compatibilidad máxima durante la demo en vivo)
az role assignment create \
  --assignee-object-id "${SP_OBJECT_ID}" \
  --assignee-principal-type ServicePrincipal \
  --role "Contributor" \
  --scope "${AKS_ID}" -o none 2>/dev/null || true
echo "✓ Roles sobre AKS configurados con éxito."

# ── Resumen de Salida ───────────────────────────────────────────────────────
echo ""
echo "=========================================================================="
echo " 🎉 INFRAESTRUCTURA Y OIDC LISTOS PARA GITHUB ACTIONS"
echo "=========================================================================="
echo ""
echo "Configura en tu repositorio de GitHub (Settings -> Secrets and variables -> Actions):"
echo ""
echo "🔑 REPOSITORY SECRETS (3 secretos OIDC, sin contraseñas):"
echo "---------------------------------------------------------"
echo "AZURE_CLIENT_ID:        ${APP_ID}"
echo "AZURE_TENANT_ID:        ${TENANT_ID}"
echo "AZURE_SUBSCRIPTION_ID:  ${SUBSCRIPTION_ID}"
echo ""
echo "📦 REPOSITORY VARIABLES (3 variables no secretas):"
echo "--------------------------------------------------"
echo "ACR_NAME:               ${ACR_NAME}"
echo "AKS_NAME:               ${AKS_NAME}"
echo "RESOURCE_GROUP:         ${RESOURCE_GROUP}"
echo ""
echo "--------------------------------------------------------------------------"
echo "Comandos opcionales para configurar automáticamente con GitHub CLI (gh):"
echo "# gh secret set AZURE_CLIENT_ID --body \"${APP_ID}\""
echo "# gh secret set AZURE_TENANT_ID --body \"${TENANT_ID}\""
echo "# gh secret set AZURE_SUBSCRIPTION_ID --body \"${SUBSCRIPTION_ID}\""
echo "# gh variable set ACR_NAME --body \"${ACR_NAME}\""
echo "# gh variable set AKS_NAME --body \"${AKS_NAME}\""
echo "# gh variable set RESOURCE_GROUP --body \"${RESOURCE_GROUP}\""
echo "=========================================================================="
