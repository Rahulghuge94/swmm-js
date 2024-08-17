# Use an official Ubuntu image as a base
FROM ubuntu:20.04

# Install required dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    cmake \
    python3 \
    python3-pip \
    curl

# Install Emscripten
RUN git clone https://github.com/emscripten-core/emsdk.git /emsdk && \
    cd /emsdk && \
    ./emsdk install latest && \
    ./emsdk activate latest && \
    echo "source /emsdk/emsdk_env.sh" >> ~/.bashrc

# Set up environment variables for Emscripten
ENV PATH="/emsdk/upstream/emscripten:$PATH"