const fs = require('fs');
const path = require('path');


const loadAvailablePlugins = (pluginsDirectory) => {
    const dirItems = fs.readdirSync(pluginsDirectory, 'utf-8');

    let plugins = [];

    dirItems.forEach(item => {
        const currentItemPath = path.join(pluginsDirectory, item);
        if (fs.lstatSync(currentItemPath).isDirectory()) {

            if (!plugins[item]) plugins[item] = {};

            const subDirItems = fs.readdirSync(currentItemPath, 'utf-8');

            subDirItems.forEach(subItem => {
                const currentSubItemPath = path.join(currentItemPath, subItem);

                if (fs.lstatSync(currentSubItemPath).isFile()) {
                    const itemName = path.basename(subItem, '.js');

                    plugins[item][itemName] = require(currentSubItemPath);
                }
            });
        }
    });

    return plugins;
};

module.exports = class PluginsHelper {
    constructor() {
        this.plugins = loadAvailablePlugins(__dirname);
    }

    async call(plugin, data, options = {}) {
        return await this.plugins[plugin].rules(data, this.plugins[plugin], options);
    }
};
