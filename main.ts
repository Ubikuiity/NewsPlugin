import { addIcon, Notice, Plugin } from 'obsidian';
import { fileCreator } from "filecreator";
import { newIc, newSyncIc } from "icons";
import { SettingsMenu, Settings, DEFAULT_SETTINGS } from 'settingsClass';

export default class NewsPlugin extends Plugin {
	settings: Settings;

	// Executed when Plugin starts (Obsidian opens)
	async onload() {
		// Handle settings of plugin
		await this.loadSettings();

		//Create the news page creator class, this is a custom class
		const pageCreator = new fileCreator(this.app.vault, this.settings, this.manifest.id);

		// This calls the menu where the user can change the parameters
		this.addSettingTab(new SettingsMenu(this.app, this));

		// Add custom ribbon to library
		addIcon('NewSynchro', newSyncIc);

		// This part creates the ribbon Icon to display the news view
		const ribbonNewsSyncIcon = this.addRibbonIcon('NewSynchro', 'News Synchro', (evt: MouseEvent) => {
			pageCreator.synchroAll();
			new Notice(`reloading news page, please don't spam this button`);
		});
	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
