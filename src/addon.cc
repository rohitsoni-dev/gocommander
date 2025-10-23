#include "go/gommander.h" // Include the Go-generated header
#include <iostream>
#include <napi.h>
#include <string>
#include <vector>
#include <memory>

// Platform-specific includes
#if defined(_WIN32)
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#ifndef NOMINMAX
#define NOMINMAX
#endif
#include <windows.h>
#else
#include <dlfcn.h>
#endif

// Function pointer types for Go exports
typedef uintptr_t (*CreateCommandFn)(char*);
typedef int (*AddOptionFn)(uintptr_t, char*, char*, char*);
typedef int (*AddArgumentFn)(uintptr_t, char*, char*, int);
typedef char* (*ParseArgsFn)(uintptr_t, int, char**);
typedef char* (*GetHelpFn)(uintptr_t);
typedef void (*InitializeFn)();
typedef void (*CleanupFn)();
typedef char* (*GetGoVersionFn)();
typedef int (*AddRefFn)(uintptr_t);
typedef int (*ReleaseFn)(uintptr_t);

// GoBackend class for cross-platform Go library loading
class GoBackend {
private:
    bool initialized_;
    bool library_loaded_;
    std::string last_error_;
    
#if defined(_WIN32)
    HMODULE dll_handle_;
#else
    void* lib_handle_;
#endif

public:
    // Function pointers for Go exports
    CreateCommandFn CreateCommand;
    AddOptionFn AddOption;
    AddArgumentFn AddArgument;
    ParseArgsFn ParseArgs;
    GetHelpFn GetHelp;
    InitializeFn Initialize;
    CleanupFn Cleanup;
    GetGoVersionFn GetGoVersion;
    AddRefFn AddRef;
    ReleaseFn Release;

    GoBackend() : initialized_(false), library_loaded_(false) {
#if defined(_WIN32)
        dll_handle_ = nullptr;
#else
        lib_handle_ = nullptr;
#endif
        // Initialize all function pointers to nullptr
        CreateCommand = nullptr;
        AddOption = nullptr;
        AddArgument = nullptr;
        ParseArgs = nullptr;
        GetHelp = nullptr;
        Initialize = nullptr;
        Cleanup = nullptr;
        GetGoVersion = nullptr;
        AddRef = nullptr;
        Release = nullptr;
    }

    ~GoBackend() {
        CleanupGo();
    }

    bool LoadGoLibrary() {
        if (library_loaded_) {
            return true;
        }

#if defined(_WIN32)
        return LoadWindowsDLL();
#else
        return LoadUnixLibrary();
#endif
    }

    bool InitializeGo() {
        if (initialized_) {
            return true;
        }

        if (!LoadGoLibrary()) {
            return false;
        }

        if (Initialize) {
            Initialize();
            initialized_ = true;
            return true;
        }

        last_error_ = "Initialize function not available";
        return false;
    }

    void CleanupGo() {
        if (initialized_ && Cleanup) {
            Cleanup();
            initialized_ = false;
        }

        if (library_loaded_) {
#if defined(_WIN32)
            if (dll_handle_) {
                FreeLibrary(dll_handle_);
                dll_handle_ = nullptr;
            }
#else
            if (lib_handle_) {
                dlclose(lib_handle_);
                lib_handle_ = nullptr;
            }
#endif
            library_loaded_ = false;
        }
    }

    bool IsAvailable() const {
        return library_loaded_ && initialized_;
    }

    const std::string& GetLastError() const {
        return last_error_;
    }

private:
#if defined(_WIN32)
    bool LoadWindowsDLL() {
        // Try multiple paths for the DLL - prioritize root directory where gommander.dll exists
        const std::vector<std::string> dllPaths = {
            "./gommander.dll",                  // Root directory (highest priority)
            "gommander.dll",                    // Current directory fallback
            "build/Release/gommander.dll",      // Build directory
            "build/Debug/gommander.dll",        // Debug build directory
            "src/gommander.dll",                // Source directory
            "src/go/gommander.dll",             // Go source directory
            "../gommander.dll",                 // Parent directory
            "../src/go/gommander.dll",          // From build directory
            "./src/go/gommander.dll"            // Relative to current
        };

        HMODULE h = nullptr;
        std::string detailed_error;

        std::cout << "Attempting to load gommander.dll from multiple paths..." << std::endl;

        for (const auto& dllPath : dllPaths) {
            std::cout << "Trying to load DLL from: " << dllPath << std::endl;
            h = LoadLibraryA(dllPath.c_str());
            if (h) {
                std::cout << "✅ Successfully loaded gommander.dll from: " << dllPath << std::endl;
                dll_handle_ = h;
                break;
            } else {
                // Get Windows error code for more detailed error reporting
                DWORD errorCode = ::GetLastError();
                std::cout << "❌ Failed to load DLL from: " << dllPath << " (Windows error: " << errorCode << ")" << std::endl;
                detailed_error += "Failed to load '" + dllPath + "' (error " + std::to_string(static_cast<unsigned long>(errorCode)) + "); ";
            }
        }

        if (!h) {
            last_error_ = "Failed to load gommander.dll from any path. Attempted paths: " + detailed_error;
            std::cout << "❌ " << last_error_ << std::endl;
            return false;
        }

        // Load function pointers
        if (!LoadWindowsFunctions(h)) {
            FreeLibrary(h);
            dll_handle_ = nullptr;
            return false;
        }

        library_loaded_ = true;
        return true;
    }

    bool LoadWindowsFunctions(HMODULE handle) {
        CreateCommand = (CreateCommandFn)GetProcAddress(handle, "CreateCommand");
        AddOption = (AddOptionFn)GetProcAddress(handle, "AddOption");
        AddArgument = (AddArgumentFn)GetProcAddress(handle, "AddArgument");
        ParseArgs = (ParseArgsFn)GetProcAddress(handle, "ParseArgs");
        GetHelp = (GetHelpFn)GetProcAddress(handle, "GetHelp");
        Initialize = (InitializeFn)GetProcAddress(handle, "Initialize");
        Cleanup = (CleanupFn)GetProcAddress(handle, "Cleanup");
        GetGoVersion = (GetGoVersionFn)GetProcAddress(handle, "GetGoVersion");
        AddRef = (AddRefFn)GetProcAddress(handle, "AddRef");
        Release = (ReleaseFn)GetProcAddress(handle, "Release");

        // Check if all required functions are loaded
        if (!CreateCommand || !AddOption || !AddArgument || !ParseArgs || 
            !GetHelp || !Initialize || !GetGoVersion) {
            last_error_ = "Failed to load required functions from Go DLL";
            return false;
        }

        return true;
    }
#else
    bool LoadUnixLibrary() {
        // For Unix systems, we use static linking, so functions should be available directly
        // The functions are declared in the header file and linked statically
        
        // Assign function pointers to the statically linked functions
        CreateCommand = ::CreateCommand;
        AddOption = ::AddOption;
        AddArgument = ::AddArgument;
        ParseArgs = ::ParseArgs;
        GetHelp = ::GetHelp;
        Initialize = ::Initialize;
        Cleanup = ::Cleanup;
        GetGoVersion = ::GetGoVersion;
        AddRef = ::AddRef;
        Release = ::Release;

        // All functions should be available with static linking
        library_loaded_ = true;
        return true;
    }
#endif
};

// Global GoBackend instance
static std::unique_ptr<GoBackend> g_go_backend;

// Error handling and data marshaling utilities
namespace DataMarshaling {
    // Error codes from Go
    enum ErrorCode {
        SUCCESS = 0,
        ERROR_INVALID_ID = 1,
        ERROR_NULL_PARAM = 2,
        ERROR_PARSE_FAIL = 3,
        ERROR_MEMORY = 4
    };

    // Convert Go error code to JavaScript error
    void ThrowGoError(Napi::Env env, int errorCode, const std::string& context = "") {
        std::string message;
        switch (errorCode) {
            case ERROR_INVALID_ID:
                message = "Invalid command ID";
                break;
            case ERROR_NULL_PARAM:
                message = "Null parameter provided";
                break;
            case ERROR_PARSE_FAIL:
                message = "Parsing failed";
                break;
            case ERROR_MEMORY:
                message = "Memory allocation error";
                break;
            default:
                message = "Unknown error (code: " + std::to_string(errorCode) + ")";
                break;
        }
        
        if (!context.empty()) {
            message = context + ": " + message;
        }
        
        Napi::Error::New(env, message).ThrowAsJavaScriptException();
    }

    // Safe string conversion from JavaScript to C string
    class SafeCString {
    private:
        std::string str_;
        char* c_str_;
        
    public:
        SafeCString(const Napi::Value& jsValue) : c_str_(nullptr) {
            if (jsValue.IsString()) {
                str_ = jsValue.As<Napi::String>().Utf8Value();
                c_str_ = const_cast<char*>(str_.c_str());
            }
        }
        
        SafeCString(const std::string& str) : str_(str) {
            c_str_ = const_cast<char*>(str_.c_str());
        }
        
        char* get() const { return c_str_; }
        bool isValid() const { return c_str_ != nullptr; }
        const std::string& getString() const { return str_; }
    };

    // Safe array conversion from JavaScript to C array
    class SafeCStringArray {
    private:
        std::vector<std::string> strings_;
        std::vector<char*> c_strings_;
        
    public:
        SafeCStringArray(const Napi::Array& jsArray) {
            uint32_t length = jsArray.Length();
            strings_.reserve(length);
            c_strings_.reserve(length);
            
            for (uint32_t i = 0; i < length; i++) {
                Napi::Value val = jsArray[i];
                if (val.IsString()) {
                    strings_.emplace_back(val.As<Napi::String>().Utf8Value());
                    c_strings_.push_back(const_cast<char*>(strings_.back().c_str()));
                } else {
                    // Handle non-string values by converting to string
                    strings_.emplace_back(val.ToString().Utf8Value());
                    c_strings_.push_back(const_cast<char*>(strings_.back().c_str()));
                }
            }
        }
        
        char** data() { return c_strings_.data(); }
        int size() const { return static_cast<int>(c_strings_.size()); }
        bool empty() const { return c_strings_.empty(); }
    };

    // Memory management for Go-allocated strings
    class GoString {
    private:
        char* str_;
        bool should_free_;
        
    public:
        GoString(char* str, bool should_free = false) : str_(str), should_free_(should_free) {}
        
        ~GoString() {
            // Note: In a real implementation, we would need to know how Go allocates strings
            // and use the appropriate deallocation method (free, C.free, etc.)
            if (should_free_ && str_) {
                // free(str_); // Uncomment when we know the correct deallocation method
            }
        }
        
        const char* get() const { return str_; }
        bool isValid() const { return str_ != nullptr; }
        
        std::string toString() const {
            return str_ ? std::string(str_) : std::string();
        }
        
        Napi::String toNapiString(Napi::Env env) const {
            return str_ ? Napi::String::New(env, str_) : Napi::String::New(env, "");
        }
    };

    // Validate command ID
    bool ValidateCommandId(Napi::Env env, const Napi::Value& value, uintptr_t& cmdId) {
        if (!value.IsNumber()) {
            Napi::TypeError::New(env, "Command ID must be a number").ThrowAsJavaScriptException();
            return false;
        }
        
        double numValue = value.As<Napi::Number>().DoubleValue();
        if (numValue < 0 || numValue != std::floor(numValue)) {
            Napi::TypeError::New(env, "Command ID must be a positive integer").ThrowAsJavaScriptException();
            return false;
        }
        
        cmdId = static_cast<uintptr_t>(numValue);
        if (cmdId == 0) {
            Napi::Error::New(env, "Invalid command ID (0)").ThrowAsJavaScriptException();
            return false;
        }
        
        return true;
    }

    // Validate string parameter
    bool ValidateString(Napi::Env env, const Napi::Value& value, const std::string& paramName) {
        if (!value.IsString()) {
            Napi::TypeError::New(env, paramName + " must be a string").ThrowAsJavaScriptException();
            return false;
        }
        
        std::string str = value.As<Napi::String>().Utf8Value();
        if (str.empty()) {
            Napi::TypeError::New(env, paramName + " cannot be empty").ThrowAsJavaScriptException();
            return false;
        }
        
        return true;
    }

    // Validate array parameter
    bool ValidateArray(Napi::Env env, const Napi::Value& value, const std::string& paramName) {
        if (!value.IsArray()) {
            Napi::TypeError::New(env, paramName + " must be an array").ThrowAsJavaScriptException();
            return false;
        }
        
        return true;
    }

    // Parse JSON result from Go
    Napi::Value ParseJsonResult(Napi::Env env, const char* jsonStr) {
        if (!jsonStr) {
            Napi::Error::New(env, "Received null JSON result from Go").ThrowAsJavaScriptException();
            return env.Null();
        }
        
        try {
            // Parse JSON string and convert to JavaScript object
            std::string jsonString(jsonStr);
            
            // For now, return the JSON string - in a full implementation,
            // we would parse it into a proper JavaScript object
            return Napi::String::New(env, jsonString);
            
        } catch (const std::exception& e) {
            Napi::Error::New(env, "Failed to parse JSON result: " + std::string(e.what()))
                .ThrowAsJavaScriptException();
            return env.Null();
        }
    }

    // Create error result object
    Napi::Object CreateErrorResult(Napi::Env env, const std::string& message, int code = -1) {
        Napi::Object result = Napi::Object::New(env);
        result.Set("success", Napi::Boolean::New(env, false));
        result.Set("error", Napi::String::New(env, message));
        if (code >= 0) {
            result.Set("code", Napi::Number::New(env, code));
        }
        return result;
    }

    // Create success result object
    Napi::Object CreateSuccessResult(Napi::Env env, const Napi::Value& data = Napi::Value()) {
        Napi::Object result = Napi::Object::New(env);
        result.Set("success", Napi::Boolean::New(env, true));
        if (!data.IsEmpty() && !data.IsUndefined()) {
            result.Set("data", data);
        }
        return result;
    }
}

// Helper function to ensure GoBackend is initialized
bool EnsureGoBackend() {
    if (!g_go_backend) {
        g_go_backend = std::make_unique<GoBackend>();
    }
    
    if (!g_go_backend->IsAvailable()) {
        return g_go_backend->InitializeGo();
    }
    
    return true;
}

// N-API wrapper functions for Go exports

// Create a new command
Napi::Value CreateCommand(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    try {
        if (!EnsureGoBackend()) {
            return DataMarshaling::CreateErrorResult(env, 
                "Go backend not available: " + g_go_backend->GetLastError());
        }
        
        if (info.Length() < 1) {
            return DataMarshaling::CreateErrorResult(env, "Missing command name argument");
        }
        
        if (!DataMarshaling::ValidateString(env, info[0], "Command name")) {
            return env.Null(); // Error already thrown
        }
        
        DataMarshaling::SafeCString name(info[0]);
        if (!name.isValid()) {
            return DataMarshaling::CreateErrorResult(env, "Invalid command name");
        }
        
        if (!g_go_backend->CreateCommand) {
            return DataMarshaling::CreateErrorResult(env, "CreateCommand function not available");
        }
        
        uintptr_t cmdId = g_go_backend->CreateCommand(name.get());
        if (cmdId == 0) {
            return DataMarshaling::CreateErrorResult(env, "Failed to create command", 
                                                   DataMarshaling::ERROR_INVALID_ID);
        }
        
        return DataMarshaling::CreateSuccessResult(env, Napi::Number::New(env, static_cast<double>(cmdId)));
        
    } catch (const std::exception& e) {
        return DataMarshaling::CreateErrorResult(env, "Exception in CreateCommand: " + std::string(e.what()));
    }
}

// Add an option to a command
Napi::Value AddOption(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    try {
        if (!EnsureGoBackend()) {
            return DataMarshaling::CreateErrorResult(env, 
                "Go backend not available: " + g_go_backend->GetLastError());
        }
        
        if (info.Length() < 3) {
            return DataMarshaling::CreateErrorResult(env, 
                "Expected at least 3 arguments: (commandId, flags, description, [defaultValue])");
        }
        
        uintptr_t cmdId;
        if (!DataMarshaling::ValidateCommandId(env, info[0], cmdId)) {
            return env.Null(); // Error already thrown
        }
        
        if (!DataMarshaling::ValidateString(env, info[1], "Flags") ||
            !DataMarshaling::ValidateString(env, info[2], "Description")) {
            return env.Null(); // Error already thrown
        }
        
        DataMarshaling::SafeCString flags(info[1]);
        DataMarshaling::SafeCString description(info[2]);
        
        char* defaultValue = nullptr;
        DataMarshaling::SafeCString defaultStr("");
        if (info.Length() > 3 && !info[3].IsNull() && !info[3].IsUndefined()) {
            if (info[3].IsString()) {
                defaultStr = DataMarshaling::SafeCString(info[3]);
                defaultValue = defaultStr.get();
            } else {
                // Convert non-string values to string
                defaultStr = DataMarshaling::SafeCString(info[3].ToString());
                defaultValue = defaultStr.get();
            }
        }
        
        if (!g_go_backend->AddOption) {
            return DataMarshaling::CreateErrorResult(env, "AddOption function not available");
        }
        
        int result = g_go_backend->AddOption(cmdId, flags.get(), description.get(), defaultValue);
        if (result != DataMarshaling::SUCCESS) {
            DataMarshaling::ThrowGoError(env, result, "AddOption");
            return env.Null();
        }
        
        return DataMarshaling::CreateSuccessResult(env, Napi::Boolean::New(env, true));
        
    } catch (const std::exception& e) {
        return DataMarshaling::CreateErrorResult(env, "Exception in AddOption: " + std::string(e.what()));
    }
}

// Add an argument to a command
Napi::Value AddArgument(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    try {
        if (!EnsureGoBackend()) {
            return DataMarshaling::CreateErrorResult(env, 
                "Go backend not available: " + g_go_backend->GetLastError());
        }
        
        if (info.Length() < 3) {
            return DataMarshaling::CreateErrorResult(env, 
                "Expected at least 3 arguments: (commandId, name, description, [required])");
        }
        
        uintptr_t cmdId;
        if (!DataMarshaling::ValidateCommandId(env, info[0], cmdId)) {
            return env.Null(); // Error already thrown
        }
        
        if (!DataMarshaling::ValidateString(env, info[1], "Argument name") ||
            !DataMarshaling::ValidateString(env, info[2], "Description")) {
            return env.Null(); // Error already thrown
        }
        
        DataMarshaling::SafeCString name(info[1]);
        DataMarshaling::SafeCString description(info[2]);
        
        int required = 1; // Default to required
        if (info.Length() > 3 && info[3].IsBoolean()) {
            required = info[3].As<Napi::Boolean>().Value() ? 1 : 0;
        } else if (info.Length() > 3 && !info[3].IsUndefined() && !info[3].IsNull()) {
            // Try to convert to boolean
            required = info[3].ToBoolean().Value() ? 1 : 0;
        }
        
        if (!g_go_backend->AddArgument) {
            return DataMarshaling::CreateErrorResult(env, "AddArgument function not available");
        }
        
        int result = g_go_backend->AddArgument(cmdId, name.get(), description.get(), required);
        if (result != DataMarshaling::SUCCESS) {
            DataMarshaling::ThrowGoError(env, result, "AddArgument");
            return env.Null();
        }
        
        return DataMarshaling::CreateSuccessResult(env, Napi::Boolean::New(env, true));
        
    } catch (const std::exception& e) {
        return DataMarshaling::CreateErrorResult(env, "Exception in AddArgument: " + std::string(e.what()));
    }
}

// Parse command line arguments
Napi::Value ParseArgs(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    try {
        if (!EnsureGoBackend()) {
            return DataMarshaling::CreateErrorResult(env, 
                "Go backend not available: " + g_go_backend->GetLastError());
        }
        
        if (info.Length() < 2) {
            return DataMarshaling::CreateErrorResult(env, 
                "Expected 2 arguments: (commandId, argumentsArray)");
        }
        
        uintptr_t cmdId;
        if (!DataMarshaling::ValidateCommandId(env, info[0], cmdId)) {
            return env.Null(); // Error already thrown
        }
        
        if (!DataMarshaling::ValidateArray(env, info[1], "Arguments array")) {
            return env.Null(); // Error already thrown
        }
        
        Napi::Array argsArray = info[1].As<Napi::Array>();
        DataMarshaling::SafeCStringArray args(argsArray);
        
        if (!g_go_backend->ParseArgs) {
            return DataMarshaling::CreateErrorResult(env, "ParseArgs function not available");
        }
        
        char* result = g_go_backend->ParseArgs(cmdId, args.size(), args.data());
        DataMarshaling::GoString goResult(result, false); // Don't auto-free for now
        
        if (!goResult.isValid()) {
            return DataMarshaling::CreateErrorResult(env, "ParseArgs returned null result");
        }
        
        // Parse the JSON result and return it
        return DataMarshaling::ParseJsonResult(env, goResult.get());
        
    } catch (const std::exception& e) {
        return DataMarshaling::CreateErrorResult(env, "Exception in ParseArgs: " + std::string(e.what()));
    }
}

// Get help text for a command
Napi::Value GetHelp(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    try {
        if (!EnsureGoBackend()) {
            return DataMarshaling::CreateErrorResult(env, 
                "Go backend not available: " + g_go_backend->GetLastError());
        }
        
        if (info.Length() < 1) {
            return DataMarshaling::CreateErrorResult(env, "Expected command ID argument");
        }
        
        uintptr_t cmdId;
        if (!DataMarshaling::ValidateCommandId(env, info[0], cmdId)) {
            return env.Null(); // Error already thrown
        }
        
        if (!g_go_backend->GetHelp) {
            return DataMarshaling::CreateErrorResult(env, "GetHelp function not available");
        }
        
        char* help = g_go_backend->GetHelp(cmdId);
        DataMarshaling::GoString goHelp(help, false); // Don't auto-free for now
        
        return DataMarshaling::CreateSuccessResult(env, goHelp.toNapiString(env));
        
    } catch (const std::exception& e) {
        return DataMarshaling::CreateErrorResult(env, "Exception in GetHelp: " + std::string(e.what()));
    }
}

// Initialize Go backend
Napi::Value InitializeGo(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    bool success = EnsureGoBackend();
    return Napi::Boolean::New(env, success);
}

// Cleanup Go backend
Napi::Value CleanupGo(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (g_go_backend) {
        g_go_backend->CleanupGo();
        return Napi::Boolean::New(env, true);
    }
    
    return Napi::Boolean::New(env, false);
}

// Add reference to a command (for memory management)
Napi::Value AddRef(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    try {
        if (!EnsureGoBackend()) {
            return DataMarshaling::CreateErrorResult(env, 
                "Go backend not available: " + g_go_backend->GetLastError());
        }
        
        if (info.Length() < 1) {
            return DataMarshaling::CreateErrorResult(env, "Expected command ID argument");
        }
        
        uintptr_t cmdId;
        if (!DataMarshaling::ValidateCommandId(env, info[0], cmdId)) {
            return env.Null(); // Error already thrown
        }
        
        if (!g_go_backend->AddRef) {
            return DataMarshaling::CreateErrorResult(env, "AddRef function not available");
        }
        
        int result = g_go_backend->AddRef(cmdId);
        if (result != DataMarshaling::SUCCESS) {
            DataMarshaling::ThrowGoError(env, result, "AddRef");
            return env.Null();
        }
        
        return DataMarshaling::CreateSuccessResult(env, Napi::Boolean::New(env, true));
        
    } catch (const std::exception& e) {
        return DataMarshaling::CreateErrorResult(env, "Exception in AddRef: " + std::string(e.what()));
    }
}

// Release reference to a command (for memory management)
Napi::Value Release(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    try {
        if (!EnsureGoBackend()) {
            return DataMarshaling::CreateErrorResult(env, 
                "Go backend not available: " + g_go_backend->GetLastError());
        }
        
        if (info.Length() < 1) {
            return DataMarshaling::CreateErrorResult(env, "Expected command ID argument");
        }
        
        uintptr_t cmdId;
        if (!DataMarshaling::ValidateCommandId(env, info[0], cmdId)) {
            return env.Null(); // Error already thrown
        }
        
        if (!g_go_backend->Release) {
            return DataMarshaling::CreateErrorResult(env, "Release function not available");
        }
        
        int result = g_go_backend->Release(cmdId);
        if (result != DataMarshaling::SUCCESS) {
            DataMarshaling::ThrowGoError(env, result, "Release");
            return env.Null();
        }
        
        return DataMarshaling::CreateSuccessResult(env, Napi::Boolean::New(env, true));
        
    } catch (const std::exception& e) {
        return DataMarshaling::CreateErrorResult(env, "Exception in Release: " + std::string(e.what()));
    }
}

// Simple function to test the addon
Napi::String Method(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    
    if (EnsureGoBackend()) {
        return Napi::String::New(env, "commander-go addon loaded successfully with Go backend");
    } else {
        std::string error_msg = "commander-go addon loaded but Go backend unavailable: " + 
                               g_go_backend->GetLastError();
        return Napi::String::New(env, error_msg);
    }
}

// Get version from Go
Napi::String GetVersion(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    
    if (!EnsureGoBackend()) {
        std::string error_msg = "Go backend unavailable: " + g_go_backend->GetLastError();
        return Napi::String::New(env, error_msg);
    }
    
    if (g_go_backend->GetGoVersion) {
        char* version = g_go_backend->GetGoVersion();
        if (version) {
            std::string version_str(version);
            // Note: In a real implementation, we might need to free the string
            // depending on how Go allocates it
            return Napi::String::New(env, version_str);
        }
    }
    
    return Napi::String::New(env, "Version unavailable");
}

// Check if Go backend is available
Napi::Boolean IsGoAvailable(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    return Napi::Boolean::New(env, EnsureGoBackend());
}

// Get detailed error information
Napi::String GetLastError(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    
    if (g_go_backend) {
        return Napi::String::New(env, g_go_backend->GetLastError());
    }
    
    return Napi::String::New(env, "GoBackend not initialized");
}

// Cleanup function called when the addon is unloaded
void Cleanup(void* arg) {
    if (g_go_backend) {
        g_go_backend->CleanupGo();
        g_go_backend.reset();
    }
}

// Initialize the addon
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    // Register cleanup function to be called when the module is unloaded
    napi_add_env_cleanup_hook(env, Cleanup, nullptr);
    
    // Initialize the GoBackend
    if (!EnsureGoBackend()) {
        // Still export functions but they'll return errors
        std::string error_msg = "Go backend initialization failed: ";
        if (g_go_backend) {
            error_msg += g_go_backend->GetLastError();
        } else {
            error_msg += "Failed to create GoBackend instance";
        }
        
        // Export error functions
        exports.Set(Napi::String::New(env, "hello"),
                    Napi::Function::New(env, [error_msg](const Napi::CallbackInfo& info) {
                        return Napi::String::New(info.Env(), error_msg);
                    }));
        exports.Set(Napi::String::New(env, "version"),
                    Napi::Function::New(env, [error_msg](const Napi::CallbackInfo& info) {
                        return Napi::String::New(info.Env(), error_msg);
                    }));
        exports.Set(Napi::String::New(env, "isGoAvailable"),
                    Napi::Function::New(env, [](const Napi::CallbackInfo& info) {
                        return Napi::Boolean::New(info.Env(), false);
                    }));
        exports.Set(Napi::String::New(env, "getLastError"),
                    Napi::Function::New(env, [error_msg](const Napi::CallbackInfo& info) {
                        return Napi::String::New(info.Env(), error_msg);
                    }));
        
        // Export stub functions that return errors
        auto errorFunction = [error_msg](const Napi::CallbackInfo& info) {
            Napi::TypeError::New(info.Env(), error_msg).ThrowAsJavaScriptException();
            return info.Env().Null();
        };
        
        exports.Set(Napi::String::New(env, "createCommand"), Napi::Function::New(env, errorFunction));
        exports.Set(Napi::String::New(env, "addOption"), Napi::Function::New(env, errorFunction));
        exports.Set(Napi::String::New(env, "addArgument"), Napi::Function::New(env, errorFunction));
        exports.Set(Napi::String::New(env, "parseArgs"), Napi::Function::New(env, errorFunction));
        exports.Set(Napi::String::New(env, "getHelp"), Napi::Function::New(env, errorFunction));
        exports.Set(Napi::String::New(env, "initialize"), Napi::Function::New(env, errorFunction));
        exports.Set(Napi::String::New(env, "cleanup"), Napi::Function::New(env, errorFunction));
        exports.Set(Napi::String::New(env, "addRef"), Napi::Function::New(env, errorFunction));
        exports.Set(Napi::String::New(env, "release"), Napi::Function::New(env, errorFunction));
        
        return exports;
    }

    // Export functions
    exports.Set(Napi::String::New(env, "hello"),
                Napi::Function::New(env, [](const Napi::CallbackInfo& info) { return Method(info); }));
    exports.Set(Napi::String::New(env, "version"),
                Napi::Function::New(env, [](const Napi::CallbackInfo& info) { return GetVersion(info); }));
    exports.Set(Napi::String::New(env, "isGoAvailable"),
                Napi::Function::New(env, [](const Napi::CallbackInfo& info) { return IsGoAvailable(info); }));
    exports.Set(Napi::String::New(env, "getLastError"),
                Napi::Function::New(env, [](const Napi::CallbackInfo& info) { return GetLastError(info); }));
    
    // Export Go command functions
    exports.Set(Napi::String::New(env, "createCommand"),
                Napi::Function::New(env, [](const Napi::CallbackInfo& info) { return CreateCommand(info); }));
    exports.Set(Napi::String::New(env, "addOption"),
                Napi::Function::New(env, [](const Napi::CallbackInfo& info) { return AddOption(info); }));
    exports.Set(Napi::String::New(env, "addArgument"),
                Napi::Function::New(env, [](const Napi::CallbackInfo& info) { return AddArgument(info); }));
    exports.Set(Napi::String::New(env, "parseArgs"),
                Napi::Function::New(env, [](const Napi::CallbackInfo& info) { return ParseArgs(info); }));
    exports.Set(Napi::String::New(env, "getHelp"),
                Napi::Function::New(env, [](const Napi::CallbackInfo& info) { return GetHelp(info); }));
    
    // Export initialization and cleanup functions
    exports.Set(Napi::String::New(env, "initialize"),
                Napi::Function::New(env, [](const Napi::CallbackInfo& info) { return InitializeGo(info); }));
    exports.Set(Napi::String::New(env, "cleanup"),
                Napi::Function::New(env, [](const Napi::CallbackInfo& info) { return CleanupGo(info); }));
    
    // Export memory management functions
    exports.Set(Napi::String::New(env, "addRef"),
                Napi::Function::New(env, [](const Napi::CallbackInfo& info) { return AddRef(info); }));
    exports.Set(Napi::String::New(env, "release"),
                Napi::Function::New(env, [](const Napi::CallbackInfo& info) { return Release(info); }));

    return exports;
}

NODE_API_MODULE(gommander, Init)