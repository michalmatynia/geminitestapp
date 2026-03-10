def npm_script_target(name, script, args = [], data = [], tags = [], visibility = None):
    native.sh_binary(
        name = name,
        srcs = ["//tools/bazel:npm_run.sh"],
        args = [script] + args,
        data = data,
        tags = tags,
        visibility = visibility,
    )
