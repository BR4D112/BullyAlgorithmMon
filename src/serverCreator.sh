#!/bin/bash

# Recibir el puerto como parámetro
puerto_disponible=$1
id=$2

# Crear y ejecutar el contenedor
docker run -d -p $puerto_disponible:3001 -e SERVER_ID=$id --name "server$puerto_disponible" lonyonserver

# Mostrar mensaje informativo
echo "Servidor creado en el puerto $puerto_disponible, con el nombre 'server$puerto_disponible' y con el id $id."