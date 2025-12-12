#!/bin/bash

MUDLET_HOME_PREFIX="$HOME/distroboxes"
DBX_CONTAINER_HOME_PREFIX="$MUDLET_HOME_PREFIX"
MUDLET_NAME="Mudlet"

DBX_CONTAINER_HOME_PREFIX=$MUDLET_HOME_PREFIX \
  distrobox create -n $MUDLET_NAME -i fedora -Y

distrobox enter $MUDLET_NAME -- bash <<'SETUP_SCRIPT'
set -uo pipefail

MUDLET_GITHUB=https://github.com/Mudlet/Mudlet.git
MUDLET_SOURCE_DIR="$HOME/.Mudlet-source"
MUDLET_BUILD_DIR="$MUDLET_SOURCE_DIR/build"

cleanSourceDir() {
  rm -rf $MUDLET_SOURCE_DIR 2>/dev/null
}

exitIfFailed() {
  exitCode=$?

  if [[ ! $exitCode -eq 0 ]]; then
    exit $exitCode
  fi
}

sudo dnf install -y \
  @development-tools \
  @development-libs \
  assimp-devel \
  boost-devel \
  ca-certificates \
  ccache \
  cmake \
  fd-find \
  gcc-c++ \
  git \
  gstreamer1-plugins-base \
  hunspell-devel \
  libcurl-devel \
  libsecret-devel \
  libxcb \
  libxkbcommon-x11-devel \
  libzip-devel \
  lua5.1 \
  lua5.1-devel \
  luarocks \
  mesa-libGLU-devel \
  mold \
  ninja-build \
  openssl \
  openssl-devel \
  pcre2-devel \
  pcre2-tools \
  pkg-config \
  pugixml-devel \
  pulseaudio-libs-devel \
  qt6-qt5compat-devel \
  qt6-qtbase-devel \
  qt6-qtmultimedia-devel \
  qt6-qttools-devel \
  qtkeychain-qt6-devel \
  ripgrep \
  sqlite-devel \
  xcb-util-image \
  xcb-util-keysyms \
  xcb-util-renderutil \
  xcb-util-wm \
  yajl-devel

exitIfFailed

installLuaRocks() {
  ROCKS=(
    "argparse"
    "lrexlib-pcre2"
    "lua-yajl"
    "lua-zip"
    "luafilesystem"
    "luasql-sqlite3"
    "luautf8"
    "lunajson"
  )

  for rock in "${ROCKS[@]}"; do
    echo ">>> Installing luarock: $rock"
    sudo luarocks --lua-version=5.1 install "$rock" && exitIfFailed
  done
}

installLuaRocks && exitIfFailed
cleanSourceDir && exitIfFailed

git clone $MUDLET_GITHUB $MUDLET_SOURCE_DIR --recursive && exitIfFailed

# Mudlet uses manual comment/uncomment blocks for release vs dev builds
# This modifies CMakeLists.txt to enable release configuration automatically
# Comment out lines 108-118 (dev version block) and uncomment lines
# 123-125 (release block)
sed -i '108,118s/^/# /; 123,125s/^# //' $MUDLET_SOURCE_DIR/CMakeLists.txt
exitIfFailed

mkdir -p $MUDLET_BUILD_DIR
exitIfFailed

cd $MUDLET_BUILD_DIR
exitIfFailed

MUDLET_VERSION_BUILD="" cmake $MUDLET_SOURCE_DIR -G Ninja \
  -DCMAKE_BUILD_TYPE=Release \
  -DUSE_ALTERNATE_LINKER=mold \
  -DUSE_SANITIZER="" \
  -DCMAKE_INSTALL_PREFIX=/usr \
  -DBUILD_SHARED_LIBS=OFF
exitIfFailed

FORCE_STATIC_LIBS=ON cmake --build . --config Release -j$(nproc)
exitIfFailed

ninja && exitIfFailed
sudo cmake --install . --strip && exitIfFailed

cd ~

cleanSourceDir && exitIfFailed

luarocks --lua-version 5.1 path --no-bin >> ~/.bashenv
. ~/.bashenv

echo
distrobox-export -a mudlet

SETUP_SCRIPT

DB_MUDLET_PATH="$MUDLET_HOME_PREFIX/$MUDLET_NAME"

echo
echo "Mudlet has been installed to: $DB_MUDLET_PATH"
echo "  To enter: distrobox enter $MUDLET_NAME"
echo "  To remove: distrobox rm $MUDLET_NAME"

if [[ -d "$HOME/.config/mudlet" ]]; then
  echo
  echo "You have an existing configuration for Mudlet in"
  echo "  $HOME/.config/mudlet"
  echo
  echo "To use it, you can:"
  echo "  rm $DB_MUDLET_PATH/mudlet-data"
  echo "  ln -s $HOME/.config/mudlet $DB_MUDLET_PATH/mudlet-data"
  echo
fi

echo "Happy MUDding!"
