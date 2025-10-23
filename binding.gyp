{
  "targets": [
    {
      "target_name": "gommander",
      "sources": [
        "src/addon.cc"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        "src"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "cflags!": [ "-fno-exceptions" ],
      "cflags_cc!": [ "-fno-exceptions" ],
      "defines": [ 
        "NAPI_DISABLE_CPP_EXCEPTIONS"
      ],
      "conditions": [
        ["OS=='win'", {
          "defines": [
            "_HAS_EXCEPTIONS=1",
            "WIN32_LEAN_AND_MEAN",
            "NOMINMAX",
            "GOMMANDER_DYNAMIC_LINK"
          ],
          "msvs_settings": {
            "VCCLCompilerTool": {
              "ExceptionHandling": 1,
              "RuntimeLibrary": 2,
              "AdditionalIncludeDirectories": [
                "<!@(node -p \"require('node-addon-api').include\")",
                "src",
                "src/go"
              ]
            }
          },
          "copies": [
            {
              "destination": "<(PRODUCT_DIR)",
              "files": [
                "src/go/gommander.dll"
              ]
            }
          ]
        }],
        ["OS!='win'", {
          "libraries": [
            "../src/go/gommander.a"
          ],
          "ldflags": [
            "-pthread"
          ],
          "cflags_cc": [
            "-std=c++17",
            "-fPIC"
          ],
          "conditions": [
            ["OS=='mac'", {
              "xcode_settings": {
                "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
                "CLANG_CXX_LIBRARY": "libc++",
                "MACOSX_DEPLOYMENT_TARGET": "10.15",
                "OTHER_CPLUSPLUSFLAGS": [
                  "-std=c++17",
                  "-stdlib=libc++"
                ]
              }
            }],
            ["OS=='linux'", {
              "cflags_cc": [
                "-std=c++17",
                "-fPIC"
              ],
              "ldflags": [
                "-Wl,--no-as-needed",
                "-lpthread"
              ]
            }]
          ]
        }]
      ]
    }
  ]
}