#!/bin/bash


# variables de entorno: ./serverKiller.sh 192.158.1.se

# Función para obtener el ID del contenedor a partir de la IP y el puerto
get_container_id() {
    local ip=$1
    local puerto=$2

    local container_id=$(docker ps -a | grep -E "($ip|$puerto)" | awk '{print $1}')

    if [ -z "$container_id" ]; then
        echo "No se encontró un contenedor con la IP $ip y el puerto $puerto."
        exit 1
    fi

    echo "$container_id"
}

# Función para eliminar un contenedor.
delete_container() {
    local container_id=$1

    echo "Eliminando el contenedor $container_id..."
    docker rm -f $container_id

    if [ $? -eq 0 ]; then
        echo "Contenedor $container_id eliminado correctamente."
    else
        echo "Error al eliminar el contenedor $container_id."
        exit 1
    fi
}

# Obtener la IP y el puerto del contenedor
ip_contenedor=$1
puerto_contenedor=$2

# Obtener el ID del contenedor
container_id=$(get_container_id $ip_contenedor $puerto_contenedor)

# Eliminar el contenedor
delete_container $container_id
