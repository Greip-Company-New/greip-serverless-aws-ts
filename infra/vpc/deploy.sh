#!/bin/bash
# Despliega la VPC de GREIP COMPANY (subnets, SGs, endpoints de VPC).
# DEV usa el stack legacy 'greip-vpc'; QA/PROD usan 'greip-vpc-<ENV>'.
#
# Uso: ENVIRONMENT=DEV|QA|PROD bash deploy.sh [profile] [region] [OfficeIp] [OpenToInternet: true|false]
#      OfficeIp puede ser IP plana (se le agrega /32) o CIDR completo.
set -euo pipefail

PROFILE=${1:-devGreipCompany}
REGION=${2:-us-east-2}
OFFICE_IP=${3:-}
OPEN_TO_INTERNET=${4:-false}
ENVIRONMENT=${ENVIRONMENT:-DEV}
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

case "${ENVIRONMENT}" in
  DEV|QA|PROD) ;;
  *) echo "ERROR: ENVIRONMENT no soportado: ${ENVIRONMENT} (DEV|QA|PROD)" >&2; exit 1 ;;
esac

STACK_NAME="greip-vpc"
if [ "${ENVIRONMENT}" != "DEV" ]; then
  STACK_NAME="greip-vpc-${ENVIRONMENT}"
fi

PARAMS=(Environment=${ENVIRONMENT} OpenToInternet=${OPEN_TO_INTERNET})
if [ -n "${OFFICE_IP}" ]; then
  case "${OFFICE_IP}" in
    */*) PARAMS+=(OfficeIp=${OFFICE_IP}) ;;
    *)   PARAMS+=(OfficeIp=${OFFICE_IP}/32) ;;
  esac
fi

echo "==> Stack ${STACK_NAME} | Environment=${ENVIRONMENT} | OpenToInternet=${OPEN_TO_INTERNET}"
aws cloudformation deploy \
  --stack-name "${STACK_NAME}" \
  --template-file "${DIR}/vpc.yml" \
  --parameter-overrides "${PARAMS[@]}" \
  --region ${REGION} --profile ${PROFILE} \
  --capabilities CAPABILITY_IAM

echo "=== Outputs del stack ==="
aws cloudformation describe-stacks --stack-name "${STACK_NAME}" --region ${REGION} --profile ${PROFILE} \
  --query 'Stacks[0].Outputs[]' --output table
