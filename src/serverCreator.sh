#!/bin/bash

# Recibir el puerto como parámetro
puerto_disponible=$1
id=$2
puertos_conocidos=$3

# Crear y ejecutar el contenedor
docker run -d -p $puerto_disponible:3001 -e SERVER_ID=$id -e MY_WEIGHT=10 -e MY_PORT=$puerto_disponible -e KNOWN_PORTS=$puertos_conocidos --name "server$puerto_disponible" lonyonserver

# Mostrar mensaje informativo
echo "Servidor creado en el puerto $puerto_disponible, con el nombre 'server$puerto_disponible' y con el id $id., y la lista de puertos $puertos_conocidos"