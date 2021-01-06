#!/usr/bin/env bash

prepare_template () {

    cp ../templateOfApt.sh tmp_template
    packages_list="$1"
    sed -i -e "s/{{ packagesToInstall }}/${packages_list}/g" tmp_template

}

executeForDistro () {

    distro=$1
    if [[ -z "$distro" ]]; then
        echo "should be passed distribution name"
        exit 1
    fi
    commands=$2
    arguments=$3


    sed -e "s/{{ baseimage }}/${distro}/g" Dockerfile_template > Dockerfile
    rc=$?
    [[ $rc != 0 ]] && >&2 echo "ERROR: error during sed substitution for distro in Dockerfile" && return $rc

    if [[ -n "${commands}" ]]; then
        sed -i -e "s/{{ commands }}/\"${commands}\",/g" Dockerfile
    else
        sed -i -e "s/{{ commands }}//g" Dockerfile
    fi
    rc=$?
    [[ $rc != 0 ]] && >&2 echo "ERROR: error during sed substitution for commands in Dockerfile" && return $rc

    if [[ -n "${arguments}" ]]; then
        arguments=$(echo ${arguments} | sed 's/ /", "/g')
        sed -i -e "s/{{ arguments }}/\"${arguments}\",/g" Dockerfile
    else
        sed -i -e 's/{{ arguments }}//g' Dockerfile
    fi
    rc=$?
    [[ $rc != 0 ]] && >&2 echo "ERROR: error during sed substitution for commands in Dockerfile" && return $rc

    docker build -t template_test:latest . 1> /dev/null
    rc=$?
    [[ $rc != 0 ]] && >&2 echo "ERROR: error during build of Dockerfile" && return $rc

    docker run --rm template_test  &> tmp_output
    rc=$?
    echo "#RC=$rc" >> tmp_output
    if grep -qE "^docker: " tmp_output ; then
        grep -vE "^#RC=" tmp_output >&2
        >&2 echo "ERROR: error during executing docker image" && return $rc
    fi
    
    docker image rm template_test 1> /dev/null
    rc=$?
    [[ $rc != 0 ]] && >&2 echo "ERROR: error during removing docker image"
    
    
    return $rc
}
checkRC() {
    actualRC=$1
    [[ $actualRC = 0 || $actualRC = 5 || $actualRC = 6 || $actualRC = 12 || $actualRC = 13 ]] && return 0 || return 1
}


test_Non_DebianBased_Distro () {
    prepare_template ""
    executeForDistro "archlinux:latest"
    rc=$?
    if checkRC $rc ; then
        assertEquals "distribution manjaro" "Unfortunately Arch-based distributions still not supported." "$(grep "Arch-based" tmp_output)" &&
        assertEquals "distribution manjaro" "#RC=13" "$(grep RC tmp_output)"
    else
        fail "Unexpected error occurs, please correct issues above"
    fi
    

    prepare_template "vim curl blah"
    executeForDistro "fedora:latest"
    rc=$?
    if checkRC $rc ; then
        assertEquals "distribution fedora: " "Unfortunately Modern Red Hat-based distributions still not supported." "$(grep "Modern Red Hat-based" tmp_output)" &&
        assertEquals "distribution fedora" "#RC=13" "$(grep RC tmp_output)"
    else
        fail "Unexpected error occurs, please correct issues above"
    fi
}

test_running_as_non_privileged() { 
    prepare_template ""
    executeForDistro "debian:latest" "su" " - devaki -c "
    rc=$?
    if checkRC $rc ; then 
        assertEquals "distribution debian, user devaki: " "This script must be run as root" "$(grep "This script must be run as root" tmp_output)" &&
        assertEquals "distribution debian" "#RC=5" "$(grep RC tmp_output)"
    else
        fail "Unexpected error occurs, please correct issues above"
    fi

}

test_empty_packages_list () {
    prepare_template ""
    executeForDistro "ubuntu:latest"
    rc=$?
    if checkRC $rc ; then 
        assertEquals "distribution ubuntu, user devaki: " "WARNING: Packages list is empty. Nothing to install. Exiting..." "$(grep "Packages" tmp_output)" &&
        assertEquals "distribution ubuntu" "#RC=6" "$(grep RC tmp_output)"
    else
        fail "Unexpected error occurs, please correct issues above"
    fi

}
. shunit2