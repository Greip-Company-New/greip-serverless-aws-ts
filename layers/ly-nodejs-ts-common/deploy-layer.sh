#!/bin/bash

# Variables
LAYER_NAME="ly-nodejs-ts-common"
DESCRIPTION="Utilitario Common de GREIP COMPANY diseñado para ser usado como Lambda Layer."
COMPATIBLE_RUNTIMES="nodejs18.x nodejs20.x nodejs22.x nodejs24.x"
REGION=${AWS_REGION:-"us-east-2"}
ZIP_FILE="ly-nodejs-ts-common.zip"
PROFILE=${1:-$AWS_PROFILE}

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [ ! -z "$PROFILE" ]; then
    echo -e "${YELLOW}Usando perfil de AWS: $PROFILE${NC}"
else
    echo -e "${YELLOW}Usando perfil de AWS por defecto${NC}"
fi

echo -e "${YELLOW}=== Desplegando Lambda Layer (ES Modules) ===${NC}"

# 1. Limpiar y construir
echo -e "${YELLOW}[1/5] Construyendo proyecto...${NC}"
npm run clean
npm run package

# 2. Verificar estructura
echo -e "${YELLOW}[2/5] Verificando estructura...${NC}"
if [ ! -d "nodejs" ]; then
    echo -e "${RED}✗ Carpeta nodejs no encontrada${NC}"
    exit 1
fi

# 3. Crear ZIP
echo -e "${YELLOW}[3/5] Creando archivo ZIP...${NC}"
zip -r $ZIP_FILE nodejs -x "*.ts" "*.map"

# 4. Publicar layer
echo -e "${YELLOW}[4/5] Publicando Lambda Layer...${NC}"
if [ -f $ZIP_FILE ]; then
    LAYER_VERSION=$(aws lambda publish-layer-version \
        --layer-name $LAYER_NAME \
        --description "$DESCRIPTION" \
        --compatible-runtimes $COMPATIBLE_RUNTIMES \
        --zip-file "fileb://$ZIP_FILE" \
        --region $REGION \
        ${PROFILE:+--profile "$PROFILE"} \
        --query 'LayerVersionArn' \
        --output text)
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Layer publicada: $LAYER_VERSION${NC}"
    else
        echo -e "${RED}✗ Error al publicar la layer${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ Archivo ZIP no encontrado${NC}"
    exit 1
fi

# 5. Limpiar
echo -e "${YELLOW}[5/5] Limpiando...${NC}"
rm -f $ZIP_FILE
rm -rf nodejs

echo -e "${GREEN}=== Despliegue completado ===${NC}"