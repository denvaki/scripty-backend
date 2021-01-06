#!/bin/sh -a

# Detect if user in Desktop Environment
HAS_DE="false"
if [ -z "$XDG_CURRENT_DESKTOP" ]; then
	HAS_DE="false"
else
	HAS_DE="true"
fi

# check and mark command for GUI notifications
HAS_ZENITY="false"
nullify command -v zenity && HAS_ZENITY="true"

# Function to display to user required messages
inform_user() {

	if [ $# -ne 2 ] && [ -z "$1" ] && [ "$2" != "info" ] && [ "$2" != "warning" ] && [ "$2" != "error" ]; then
		inform_user "Should be passed two arguments: message text and inform type(info, warning, error)" "error"
		exit 20
	fi

	if [ "${HAS_ZENITY}" = "true" ] && [ "${HAS_DE}" = "true" ]; then
		CMD="zenity --width 130 --title Scripty --no-wrap --${2} --text '${1}'"
		eval ${CMD}
	else
		type=$(echo "${2}" | awk '{ print toupper($0) }')
		printf "${type}: ${1}\n"
	fi

}

if [ "$(id -u)" != 0 ]; then
	inform_user "This script must be run as root" "error"
	exit 5
fi

nullify() {
	"$@" >/dev/null 2>&1
	return $?
}

find_bin() {
	for x in $(echo "$PATH" | sed 's/:/\n/g'); do
		[ -f "$x/${1}" ] && return 0
	done
	return 1
}

# Find our package manager
if nullify find_bin apt-get || nullify find_bin apt; then
	DIST_BASE="Debian-based"
elif nullify find_bin yum; then
	DIST_BASE="Modern Red Hat-based"
elif nullify find_bin portage; then
	DIST_BASE="Gentoo-based"
elif nullify find_bin pacman; then
	DIST_BASE="Arch-based"
else
	echo "Unknown distribution. Please run this script on Debian-Based distributions(Debian, Ubuntu, Linux Mint, Pop_OS ...)" >&2
	exit 12
fi



# Inform user if distribution is not supported
if [ "${DIST_BASE}" != "Debian-based" ]; then
	inform_user "\nUnfortunately ${DIST_BASE} distributions still not supported.\nExiting..." "error"
	exit 13
fi

packages="{{ packagesToInstall }}"

packages_wo_spaces="$(printf "$packages" | sed -E 's/[[:blank:]]//g')"
[ -z "${packages_wo_spaces}" ] && inform_user "Packages list is empty. Nothing to install. Exiting..." "warning" && exit 6


if nullify ls /var/lib/apt/lists/*Packages && "${HAS_ZENITY}" = "false" && "${HAS_DE}" = "true"; then
	nullify apt-get install -y zenity
	[ $? -eq 0 ] && HAS_ZENITY="true"
fi

rm -f ~/.scripty_tmp 2>/dev/null
apt-get -y update >~/.scripty_tmp 2>&1
EXIT_CODE=$?
if [ ${EXIT_CODE} != 0 ] || grep -qE '^[WEN]:' ~/.scripty_tmp; then
	inform_user "During repositories updating received an error\nContinuing...\n$(grep -qE '^[WEN]:' ~/.scripty_tmp)" "warning"
fi
rm -f ~/.scripty_tmp 2>/dev/null

packages="{{ packagesToInstall }}"
packages_amount=$(echo "$packages" | tr " " "\n" | wc -l | tr -d " ")
counter=1
installed=""

for i in ${packages}; do
	printf "\rInstalling $counter of $packages_amount"
	apt-get -y install $i >~/.scripty_tmp 2>&1
	EXIT_CODE=$?
	if [ ${EXIT_CODE} != 0 ] || grep -qE '^[WEN]:' ~/.scripty_tmp; then
		echo && inform_user "Error while installing \"$i\" package\n $(grep -qE '^[WEN]:' ~/.scripty_tmp)" "error"
	else
		installed="$installed $i"
	fi
	counter=$((counter + 1))
	>~/.scripty_tmp
done
echo
rm -f ~/.scripty_tmp 2>/dev/null
inform_user "Successfully installed:\n$installed" "info" && echo
inform_user "Execution is finished" "info" && echo
