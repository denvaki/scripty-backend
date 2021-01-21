#!/bin/sh

root="${PROJECT_ROOT:-./}"

debug=0

while getopts "d:e:r:c:a:q:m:t:b" arg; do
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
    q)
        query_data=$OPTARG
        ;;
    m)
        mode=$OPTARG
        ;;
    t)
        type=$OPTARG
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
[ -z "${query_data}" ] && >&2 echo "no query data specified" && exit 1
[ -z "${type}" ] && type="package"
[ "${type}" != "package" ] && [ "${type}" != "filename" ] && >&2 echo "wrong type specified" && exit 1

[ -z "${mode}" ] && mode="strict"
[ "${mode}" != "strict" ] && [ "${mode}" != "endsWith" ] && [ "${mode}" != "startsWith" ] && [ "${mode}" != "contains" ] && echo "wrong mode specified" && exit 1


[ -z "${rootdir}" ] && rootdir="*"
[ -z "${release}" ] && release="*"
[ -z "${component}" ] && component="*"
[ -z "${architecture}" ] && architecture="*"


if [ $type = "package" ]; then
    filenames="${root}packages/${distro}+${rootdir}+${release}+${component}+binary-${architecture}+Packages"
else
    filenames="${root}contents/${distro}+${rootdir}+${release}*+Contents-${architecture}"
fi

ls  ${filenames} 2>&1 >/dev/null
if [ $? -ne 0 ]; then
  >&2  echo "no data file found by passed params, ${filenames}" && exit 1
fi



if [ $type = "package" ]; then
    match_any_chars=".*"
else
    match_any_chars="[^\/]*"
fi


if [ "${mode}" = "endsWith" ]; then
    query_data=$(echo "${query_data}" | sed "s/|/|${match_any_chars}/g")
    query_data="${match_any_chars}${query_data}"
elif [ "${mode}" = "startsWith" ]; then
    query_data="$(echo "${query_data}" | sed "s/|/${match_any_chars}|/g")"
    query_data="${query_data}${match_any_chars}"
elif [ "${mode}" = "contains" ]; then
    query_data="$(echo "${query_data}" | sed "s/|/${match_any_chars}|${match_any_chars}/g")"
    query_data="${match_any_chars}${query_data}${match_any_chars}"
fi

if [ $type = "package" ]; then
    for file in ${filenames}; do 
        sed -n -E "/Package: (${query_data})$/,/^$/{s/^$/Release: $(echo ${file} | cut -d'+' -f3)\n/; p}" ${file}
    done
else
    grep -h -E "\/(${query_data})[[:blank:]]+[0-9A-Za-z\/\,-]+$" ${filenames}  | sort | uniq | head -200
fi