import NewsPlugin from 'main';
import { Vault, TFile } from "obsidian";
import { Settings } from "settingsClass";

export class newsCleaner {

    mainPlugin: NewsPlugin
    obsVault: Vault;
    pSettings: Settings;

    constructor(plugin: NewsPlugin) {
        this.mainPlugin = plugin;
        this.obsVault = plugin.app.vault;
        this.pSettings = plugin.settings;
    }

    // Need to find pointed and marked files, check their modification dates and delete the new icon if they are not new enough

}