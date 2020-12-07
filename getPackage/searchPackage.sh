#!/bin/sh

root="${PROJECT_ROOT:-./}"

debug=0

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
    b)
        debug=1
        root='../'
        ;;
    *)
        >&2 echo "unknown argument passed"
        exit 1
        ;;
  esac
done

[ -z "${distro}" ] && >&2 echo "no distro specified" && exit 1

[ -z "${rootdir}" ] && rootdir="*"
[ -z "${release}" ] && release="*"
[ -z "${component}" ] && component="*"
[ -z "${architecture}" ] && architecture="*"

[ -z "${package}" ] && >&2 echo "no package specified" && exit 1
[ -z "${mode}" ] && mode="strict"
[ "${mode}" != "strict" ] && [ "${mode}" != "endsWith" ] && [ "${mode}" != "startsWith" && "${mode}" != "contains" ] && [ echo "wrong mode specified"  ] && exit 1

filenames="${root}packages/${distro}+${rootdir}+${release}+${component}+binary-${architecture}+Packages"

ls  ${filenames} 2>&1 >/dev/null
if [ $? -ne 0 ]; then
  >&2  echo "no Package file found by passed params, ${filenames}" && exit 1
fi

if [ "${package}" = *'|'* ]; then
    package=$( echo "\(${package}\)" | sed 's/|/\\|/g') 
fi


if [ "${mode}" = "endsWith" ]; then
    package=".*${package}"
elif [ "${mode}" = "startsWith" ]; then
    package="${package}.*"
elif [ "${mode}" = "contains" ]; then
    package=".*${package}.*"
fi

echo "${filenames}"
for file in ${filenames}; do 
    
    sed -n "/Package: ${package}$/,/^$/{s/^$/Release: $(echo ${file} | cut -d'+' -f3)\n/; p}" ${file}
done