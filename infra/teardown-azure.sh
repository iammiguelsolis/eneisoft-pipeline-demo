#!/usr/bin/env bash
# ═════════════════════════════════════════════════════════════════════════════
# ENEISOFT XVI – Teardown y Limpieza de Recursos en Azure
#
# Borra el Resource Group completo (detiene costos) y elimina el App Registration
# en Microsoft Entra ID.
# ═════════════════════════════════════════════════════════════════════════════

set -euo pipefail

RESOURCE_GROUP="${RESOURCE_GROUP:-rg-eneisoft-demo}"
APP_REG_NAME="${APP_REG_NAME:-sp-github-eneisoft-demo}"

echo "⚠️  ATENCIÓN: Se procederá a eliminar la infraestructura de la demo:"
echo "   - Resource Group: ${RESOURCE_GROUP}"
echo "   - App Registration: ${APP_REG_NAME}"
echo ""

read -p "¿Estás seguro de continuar con la eliminación? (s/N): " -r CONFIRM
if [[ ! "$CONFIRM" =~ ^[sS]$ ]]; then
  echo "Operación cancelada."
  exit 0
fi

echo "--> Eliminando App Registration '${APP_REG_NAME}' en Entra ID..."
APP_ID=$(az ad app list --display-name "${APP_REG_NAME}" --query "[0].appId" -o tsv || true)
if [ -n "${APP_ID}" ]; then
  az ad app delete --id "${APP_ID}"
  echo "✓ App Registration eliminada."
else
  echo "ℹ️  No se encontró App Registration con el nombre '${APP_REG_NAME}'."
fi

echo "--> Eliminando Resource Group '${RESOURCE_GROUP}' (esto destruye ACR, AKS y discos)..."
az group delete --name "${RESOURCE_GROUP}" --yes --no-wait

echo ""
echo "✓ Comando de eliminación enviado exitosamente en segundo plano."
echo "  Los recursos de cómputo y almacenamiento se están liberando para detener facturación."
