#!/bin/bash

# Install dependencies
sudo apt-get update
sudo apt-get install -y build-essential git cmake python3 curl

# Clone and install Emscripten SDK
git clone https://github.com/emscripten-core/emsdk.git $HOME/emsdk
cd $HOME/emsdk
./emsdk install latest
./emsdk activate latest

# Set up environment variables for Emscripten
echo "source $HOME/emsdk/emsdk_env.sh" >> $HOME/.bashrc
source $HOME/.bashrc
