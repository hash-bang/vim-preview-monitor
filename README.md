vim-preview-monitor
===================
NeoVim remote plugin to watch a file and display it in a preview window.

This project came about because I needed a non-intrucive method of displaying compile errors from a complex pipeline without invoking the pipeline via Vi itself.


How it works
------------

1. When enabled on a buffer, the directory tree is examined upwards until we hit the `mon_root_file`, this is then used as the project root
2. Set up a file system monitor for the `mon_file` within the discovered root directory
3. When the file exists (or has a size above zero) we display the preview window within the tab showing its contents, when the file does not exist we close the preview window.


Installation
------------
Install the module in the usual way, e.g. if using Pathogen:

* `cd ~/.vim/bundle`
* `git clone https://github.com/hash-bang/vim-preview-monitor.git`


Make sure that the `neovim` NPM module is installed:

* `npm -g i neovim`

Update your plugin cache within vi:

* `neovim +:UpdateRemotePlugins +:quit`


Settings / Variables
====================
Settings are applicable per-buffer.

```
let b:mon_root_file = "package.json"
let b:mon_file = ".error"
let b:mon_window_opts = "+wincmd\\ J"
```


`mon_root_file`
===============
Defaults to `package.json`.
The file to look for which identifies a project root.


`mon_file`
==========
Defaults to `.error`.
The file to display in the preview window when it is present.


`mon_window_opts`
=================
Defaults to `+wincmd\\ J`.
Additional command line options to specify when invoking the monitor command.


Commands
========
Any of the following commands can be entered per-buffer in Normal Mode to enable monitoring behaviour.


`MonOn`
-------
Enable the Monitor for this buffer using local variables to identify the project root / monitor file.


`MonOnLazy`
-----------
Similar to `MonOn` but fail silently and disable if the buffer path cannot be determined or the project root directory cannot be located.


`MonOff`
--------
Disable monitoring for this buffer.


Troubleshooting
===============
NeoVim does not automatically refresh remote plugins.
If any of the `Mon*` functions are not available try running `:UpdateRemotePlugins` to make NeoVim regenerate its cache.
Failing that run `:checkhealth provider` to see if anything is missing.
