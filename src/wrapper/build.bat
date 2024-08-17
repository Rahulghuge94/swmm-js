mkdir -p build
set EMSDK=C:\Users\Rahul Ghuge\emsdk
emcc -lembind -O2 \
swmm_cppwrapper.cpp \
-o swmm.js\
src/*.c \
--exclude-file src/main.c
-Isrc \
-I ${EMSDK}/upstream/emscripten/system/include \
-sNO_DISABLE_EXCEPTION_CATCHING \
-sINITIAL_MEMORY="1"\
-sALLOW_MEMORY_GROWTH="1"\
-sFORCE_FILESYSTEM="1" \
-s WASM=0\
-s EXPORTED_RUNTIME_METHODS='["ccall"]'\
--no-entry