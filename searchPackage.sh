#!/bin/bash

while getopts "d:e:r:c:a:p:m:" arg; do
  case $arg in
    d)
        distro=$OPTARG
        ;;
    e)
        rootdir=$OPTARG
        ;;
    r)
        release=$OPTARG
        ;;
    c)
        component=$OPTARG
        ;;
    a)
        architecture=$OPTARG
        ;;
    p)
        package=$OPTARG
        ;;
    m)
        mode=$OPTARG
        ;;
    *)
        echo "unknown argument passed"
        exit 1
        ;;
  esac
done

[[ -z "${distro}" ]] && echo "no distro specified" && exit 1

[[ -z "${rootdir}" ]] && rootdir="*"
[[ -z "${release}" ]] && release="*"
[[ -z "${component}" ]] && component="*"
[[ -z "${architecture}" ]] && architecture="*"

[[ -z "${package}" ]] && echo "no package specified" && exit 1
[[ -z "${mode}" ]] && mode="strict"
[[ "${mode}" != "strict" && "${mode}" != "endsWith" && "${mode}" != "startsWith" && "${mode}" != "contains" ]] && echo "wrong mode specified" && exit 1

filename="./output/${distro}+${rootdir}+${release}+${component}+binary-${architecture}+Packages"
echo "$filename"
if [[ ! $( compgen -G "${filename}" ) ]];then
    echo "no file found by passed params" && exit 1
fi

if [[ "${mode}" == "endsWith" ]]; then
    package=".*${package}"
elif [[ "${mode}" == "startsWith" ]]; then
    package="${package}.*"
elif [[ "${mode}" == "contains" ]]; then
    package=".*${package}.*"
fi

sed -n "/Package: ${package}$/,/^$/p" ${filename}