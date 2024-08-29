if exist build\ (
    RMDIR build
)

mkdir build

rem if EMSDK is not set then return
rem if "%EMSDK%"=="" (
rem    echo EMSDK variable is not found. set the variable first and then run.
rem)

rem emcc -lembind -O2 swmm_cppwrapper.cpp -o swmmEngine.js src\climate.c src\controls.c src\culvert.c src\datetime.c src\dwflow.c src\dynwave.c src\error.c src\exfil.c src\findroot.c src\flowrout.c src\forcmain.c src\gage.c src\gwater.c src\hash.c src\hotstart.c src\iface.c src\infil.c src\inflow.c src\inlet.c src\input.c src\inputrpt.c src\keywords.c src\kinwave.c src\landuse.c src\lid.c src\lidproc.c src\link.c src\main.c src\massbal.c src\mathexpr.c src\mempool.c src\node.c src\odesolve.c src\output.c src\project.c src\qualrout.c src\rain.c src\rdii.c src\report.c src\roadway.c src\routing.c src\runoff.c src\shape.c src\snow.c src\stats.c src\statsrpt.c src\street.c src\subcatch.c src\surfqual.c src\swmm5.c src\table.c src\toposort.c src\transect.c src\treatmnt.c src\xsect.c --exclude-file src/main.c -Isrc -I ${EMSDK}/upstream/emscripten/system/include -sNO_DISABLE_EXCEPTION_CATCHING -sALLOW_MEMORY_GROWTH="1" -sFORCE_FILESYSTEM="1" -s WASM=0 -s EXPORTED_RUNTIME_METHODS='["ccall"]' --no-entry