#include "gommander.h" // Include the Go-generated header
#include <iostream>
#include <napi.h>

// On Windows we'll load the Go DLL at runtime to avoid link-time unresolved
// externals. On other platforms the static archive (.a) will be linked.
#if defined(_WIN32)
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#ifndef NOMINMAX
#define NOMINMAX
#endif
#include <windows.h>

typedef void* (*CreateCommandFn)(char*);
typedef void (*AddCommandFn)(void*, void*);
typedef int (*ParseFn)(void*, int, char**);
typedef void (*InitializeFn)();
typedef char* (*VersionFn)();

static CreateCommandFn CreateCommand_ptr = nullptr;
static AddCommandFn AddCommand_ptr = nullptr;
static ParseFn Parse_ptr = nullptr;
static InitializeFn Initialize_ptr = nullptr;
static VersionFn Version_ptr = nullptr;

static bool LoadGoDll() {
  HMODULE h = LoadLibraryA("gommander.dll");
  if (!h) return false;
  CreateCommand_ptr = (CreateCommandFn)GetProcAddress(h, "CreateCommand");
  AddCommand_ptr = (AddCommandFn)GetProcAddress(h, "AddCommand");
  Parse_ptr = (ParseFn)GetProcAddress(h, "Parse");
  Initialize_ptr = (InitializeFn)GetProcAddress(h, "Initialize");
  Version_ptr = (VersionFn)GetProcAddress(h, "Version");
  return CreateCommand_ptr && AddCommand_ptr && Parse_ptr && Initialize_ptr && Version_ptr;
}
#else
extern "C" {
void* CreateCommand(char* name);
void AddCommand(void* parentPtr, void* childPtr);
int Parse(void* cmdPtr, int argc, char** argv);
void Initialize(void);
char* Version(void);
}
#endif

// Simple function to test the addon
Napi::String Method(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();
  return Napi::String::New(env, "commander-go addon loaded successfully");
}

// Get version from Go
Napi::String GetVersion(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();
  // Call the Go Version function (either via runtime-loaded DLL or direct)
#if defined(_WIN32)
  if (!Version_ptr) {
    if (!LoadGoDll()) return Napi::String::New(env, "");
  }
  char* version = Version_ptr();
#else
  char* version = Version();
#endif
  return Napi::String::New(env, version);
}

// Initialize the addon
Napi::Object Init(Napi::Env env, Napi::Object exports) {
  // Initialize Go runtime (cgo-exported symbol)
#if defined(_WIN32)
  if (!Initialize_ptr) {
    if (!LoadGoDll()) {
      // Could not load Go runtime; just return exports without init
      return exports;
    }
  }
  Initialize_ptr();
#else
  Initialize();
#endif

  // Export functions (wrap in lambdas to avoid overload resolution issues)
  exports.Set(Napi::String::New(env, "hello"),
              Napi::Function::New(env, [](const Napi::CallbackInfo& info) {
                return Method(info);
              }));
  exports.Set(Napi::String::New(env, "version"),
              Napi::Function::New(env, [](const Napi::CallbackInfo& info) {
                return GetVersion(info);
              }));

  return exports;
}

NODE_API_MODULE(gommander, Init)