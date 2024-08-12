#include <emscripten/bind.h>
#include "swmm5.h"

using namespace emscripten;

class SWMM {
public:
    SWMM() {
        // Constructor can initialize SWMM or manage resources if needed
    }

    ~SWMM() {
        // Destructor can handle cleanup if needed
    }

    // Function wrappers for SWMM API
    int getVersion() {
        return swmm_getVersion();
    }

    int run(std::string f1, std::string f2, std::string f3) {
        return swmm_run(const_cast<char*>(f1.c_str()), const_cast<char*>(f2.c_str()), const_cast<char*>(f3.c_str()));
    }

    int open(std::string f1, std::string f2, std::string f3) {
        return swmm_open(const_cast<char*>(f1.c_str()), const_cast<char*>(f2.c_str()), const_cast<char*>(f3.c_str()));
    }

    int start(int saveFlag) {
        return swmm_start(saveFlag);
    }

    int step(double elapsedTime) {
        return swmm_step(&elapsedTime);
    }

    int stride(int strideStep, double elapsedTime) {
        return swmm_stride(strideStep, &elapsedTime);
    }

    int end() {
        return swmm_end();
    }

    int getMassBalErr(float runoff, float flow, float qual) {
        return swmm_getMassBalErr(&runoff, &flow, &qual);
    }

    int report() {
        return swmm_report();
    }

    int close() {
        return swmm_close();
    }

    int getWarnings() {
        return swmm_getWarnings();
    }

    int getError(std::string errMsg, int msgLen) {
        return swmm_getError(const_cast<char*>(errMsg.c_str()), msgLen);
    }

    int getCount(int objType) {
        return swmm_getCount(objType);
    }

    void getName(int objType, int index, std::string name, int size) {
        char* c_name = new char[size];
        std::strcpy(c_name, name.c_str());

        swmm_getName(objType, index, c_name, size);
        name = std::string(c_name);
        delete[] c_name;
    }

    int getIndex(int objType, std::string name) {
        return swmm_getIndex(objType, name.c_str());
    }

    double getValue(int property, int index) {
        return swmm_getValue(property, index);
    }

    double getSavedValue(int property, int index, int period) {
        return swmm_getSavedValue(property, index, period);
    }

    void setValue(int property, int index, double value) {
        swmm_setValue(property, index, value);
    }

    void writeLine(std::string line) {
        swmm_writeLine(line.c_str());
    }

    void decodeDate(double date, int year, int month, int day, int hour, int minute, int second, int dayOfWeek) {
        swmm_decodeDate(date, &year, &month, &day, &hour, &minute, &second, &dayOfWeek);
    }
};

// Binding code
EMSCRIPTEN_BINDINGS(swmm_module) {
    class_<SWMM>("SWMM")
        .constructor<>()
        .function("getVersion", &SWMM::getVersion)
        .function("run", &SWMM::run)
        .function("open", &SWMM::open)
        .function("start", &SWMM::start)
        .function("step", &SWMM::step)
        .function("stride", &SWMM::stride)
        .function("end", &SWMM::end)
        .function("getMassBalErr", &SWMM::getMassBalErr)
        .function("report", &SWMM::report)
        .function("close", &SWMM::close)
        .function("getWarnings", &SWMM::getWarnings)
        .function("getError", &SWMM::getError)
        .function("getCount", &SWMM::getCount)
        .function("getName", &SWMM::getName)
        .function("getIndex", &SWMM::getIndex)
        .function("getValue", &SWMM::getValue)
        .function("getSavedValue", &SWMM::getSavedValue)
        .function("setValue", &SWMM::setValue)
        .function("writeLine", &SWMM::writeLine)
        .function("decodeDate", &SWMM::decodeDate);
}
