{
  "targets": [
    {
      "target_name": "gommander",
      "sources": [
        "src/addon.cc"
      ],
      "libraries": [
        "../src/gommander.a"
      ],
      "conditions": [
        ["OS==\"win\"", {
          "libraries": []
        }]
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
        "NAPI_DISABLE_CPP_EXCEPTIONS",
        "GO_CGO_PROLOGUE_H="
      ],
      "conditions": [
        ["OS==\"win\"", {
          "defines": [
            "_HAS_EXCEPTIONS=1"
          ],
          "msvs_settings": {
            "VCCLCompilerTool": {
              "ExceptionHandling": 1,
              "AdditionalIncludeDirectories": [
                "<!@(node -p \"require('node-addon-api').include\")"
              ]
            }
          }
        }]
      ]
    }
  ]
}