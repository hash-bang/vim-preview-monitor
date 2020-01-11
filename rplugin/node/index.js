var chokidar = require('chokidar');
var fs = require('fs');
var fspath = require('path');

/**
* Main worker function
* @param {NeoVimPlugin} plugin The NeoVimPlugin instance
*/
module.exports = function(plugin) {
	/**
	* Object tracking each absolute file name and its watcher
	* @type {Object}
	* @property {string} path The path of the buffer, also used as the object key
	* @property {string} projectPath The path of the project root
	* @property {stirng} watchPath The path to watch (computed full path of mon_file)
	* @property {string} mon_root_file The root file to use in each buffer
	* @property {string} mon_file The file to watch for
	* @property {string} mon_window_opts Additional +cmd options when spawning the preview window
	* @property {Chockidar} watcher The Chockidar watcher instance
	*/
	var monitors = {};


	/**
	* Default options to use when populating new `monitors` instances
	*/
	var monitorDefaults = {
		mon_root_file: 'package.json',
		mon_file: '.error',
		mon_window_opts: '+wincmd\\ J',
	};

	var watchHandle; // Populated with the Chokidar instance

	var monitorFunc = (monitor, stats) => {
		plugin.nvim.outWrite(`Current size ${stats ? stats.size : 'NO STATS'}\n`)

		if (stats && stats.size > 0) {
			plugin.nvim.command(`pedit ${monitor.mon_window_opts} ${monitor.watchPath}`)
		} else {
			plugin.nvim.command('pclose');
		}
	};

	// MonOn / MonOnLazy {{{
	var execMonOn = (lazy = false) => Promise.resolve()
		// Query file path + buffer variables {{{
		.then(()=> Promise.all([
			plugin.nvim.callFunction('expand', '%:p'),
			plugin.nvim.buffer.getVar('mon_root_file').then(res => res || monitorDefaults.mon_root_file),
			plugin.nvim.buffer.getVar('mon_file').then(res => res || monitorDefaults.mon_file),
			plugin.nvim.buffer.getVar('mon_window_opts').then(res => res || monitorDefaults.mon_window_opts),
		]))
		// }}}
		// Setup watcher instance {{{
		.then(data => {
			var [path, mon_root_file, mon_file, mon_window_opts] = data;
			if (!path) throw new Error('Cannot determine buffer file path');

			return monitors[path] = {
				path,
				projectPath: undefined,
				watchPath: undefined,
				mon_root_file,
				mon_file,
				mon_window_opts,
				watcher: undefined,
			};
		})
		// }}}
		// Determine montitor.projectPath by scanning this dir upwards until we find a monitor.mon_root_file {{{
		.then(monitor => new Promise((resolve, reject) => {
			var scanPath = monitor.path;

			var examinePath = ()=>
				fs.promises.stat(fspath.join(scanPath, monitor.mon_root_file))
					.then(()=> {
						monitor.projectPath = scanPath;
						monitor.watchPath = fspath.join(scanPath, monitor.mon_file);
						resolve(monitor)
					})
					.catch(()=> {
						if (examinePath == '/') {
							execMonOff();
							return reject(`Cannot determine project root directory. ${monitor.mon_root_file} not found in tree`);
						}
						scanPath = fspath.resolve(fspath.join(scanPath, '..'));
						examinePath();
					})

			examinePath();
		}))
		// }}}
		// Display message {{{
		.then(monitor => {
			plugin.nvim.outWrite(`Monitoring project directory ${monitor.projectRoot}\n`);
			return monitor;
		})
		// }}}
		// Setup file watcher which invokes the preview window when we notice the file exists, close when it doesnt {{{
		.then(monitor => {
			monitor.watcher = chokidar.watch(monitor.watchPath, {
				alwaysStat: true,
				awaitWriteFinish: true,
				disableGlobbing: true,
			})
				.on('change', (path, stats) => monitorFunc(monitor, stats));

			return monitor;
		})
		// }}}
		// Call the monitor immediately to show the window if its needed {{{
		.then(monitor => fs.promises.stat(monitor.watchPath)
			.then(stats => monitorFunc(monitor, stats))
		)
		// }}}
		// Error handling {{{
		.catch(e => {
			if (lazy) return; // Fail silently if in lazy mode
			debugger;
			console.error(e);
		});
		// }}}

	plugin.registerCommand('MonOn', ()=> execMonOn());
	plugin.registerCommand('MonOnLazy', ()=> execMonOn(lazy = true));
	// }}}

	// MonOff {{{
	var execMonOff = ()=> Promise.resolve()
		.then(()=> plugin.nvim.callFunction('expand', '%:p'))
		.then(path => {
			if (monitors[path]) {
				monitors[path].watcher.close();
				delete monitors[path];
			}
		});

	plugin.registerCommand('MonOff', execMonOff, {sync: false});
	// }}}
};
