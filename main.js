'use strict';

const obsidian = require('obsidian');
const { execFile } = require('child_process');

const DEFAULT_SETTINGS = {
	syncIntervalMinutes: 5,
	dailyNotesFolder: 'daily-notes',
	excludedLists: ['Groceries', 'Watch list', 'Wish List']
};

const REMINDERS_CLI = '/opt/homebrew/bin/reminders';

function runCli(args) {
	return new Promise((resolve, reject) => {
		execFile(REMINDERS_CLI, args, { maxBuffer: 2 * 1024 * 1024, timeout: 15000 }, (err, stdout) => {
			if (err) reject(err);
			else resolve(stdout.trim());
		});
	});
}

function priorityLabel(p) {
	if (p === 1) return ' !!!';
	if (p > 0 && p <= 5) return ' !!';
	if (p > 5 && p <= 9) return ' !';
	return '';
}

function todayStr() {
	const d = new Date();
	const mm = String(d.getMonth() + 1).padStart(2, '0');
	const dd = String(d.getDate()).padStart(2, '0');
	return `${d.getFullYear()}-${mm}-${dd}`;
}

class RemindersSyncPlugin extends obsidian.Plugin {

	async onload() {
		await this.loadSettings();

		this.addRibbonIcon('check-circle', 'Sync reminders', () => {
			this.sync(true);
		});

		this.addCommand({
			id: 'sync-reminders',
			name: "Sync today's Apple Reminders into daily note",
			callback: () => this.sync(true)
		});

		this.addSettingTab(new RemindersSyncSettingsTab(this.app, this));

		this.registerInterval(
			window.setInterval(() => this.sync(false), this.settings.syncIntervalMinutes * 60 * 1000)
		);

		// initial sync after vault loads
		this.registerInterval(window.setTimeout(() => this.sync(false), 3000));
	}

	async loadSettings() {
		const data = await this.loadData();
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data || {});
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async fetchReminders() {
		const raw = await runCli(['show-all', '--due-date', 'today', '--format', 'json']);
		return JSON.parse(raw);
	}

	async sync(showNotice) {
		try {
			const all = await this.fetchReminders();
			const excluded = this.settings.excludedLists;

			const reminders = all.filter(r => !r.isCompleted && !excluded.includes(r.list));

			await this.updateDailyNote(reminders);

			if (showNotice) {
				new obsidian.Notice(`Synced ${reminders.length} reminders`);
			}
		} catch (e) {
			console.error('Reminders Sync:', e);
			if (showNotice) {
				new obsidian.Notice(`Sync failed: ${e.message}`);
			}
		}
	}

	async updateDailyNote(reminders) {
		const today = todayStr();
		const dailyPath = obsidian.normalizePath(`${this.settings.dailyNotesFolder}/${today}.md`);
		const file = this.app.vault.getFileByPath(dailyPath);
		if (!file) return;

		// build reminder lines with notes
		const reminderLines = [];
		for (const item of reminders) {
			let line = `- [ ] ${item.title}${priorityLabel(item.priority)}`;
			if (item.notes) {
				line += '\n\t' + item.notes.replace(/\n/g, '\n\t');
			}
			reminderLines.push({ title: item.title, text: line });
		}

		if (reminderLines.length === 0) return;

		await this.app.vault.process(file, (content) => {
			const lines = content.split('\n');

			// find ## TODO section boundaries
			let todoIdx = -1;
			let insertIdx = -1;
			for (let i = 0; i < lines.length; i++) {
				if (/^## TODO/.test(lines[i])) {
					todoIdx = i;
					insertIdx = i + 1;
					while (insertIdx < lines.length && !/^## /.test(lines[insertIdx]) && !/^---/.test(lines[insertIdx])) {
						insertIdx++;
					}
					break;
				}
			}

			if (todoIdx === -1) return content;

			// deduplicate by title
			const existingBlock = lines.slice(todoIdx, insertIdx).join('\n');
			const newLines = reminderLines
				.filter(r => !existingBlock.includes(r.title))
				.map(r => r.text);

			if (newLines.length === 0) return content;

			const before = lines.slice(0, insertIdx);
			const after = lines.slice(insertIdx);
			return before.concat(newLines, after).join('\n');
		});
	}
}

// ─── Settings ───────────────────────────────────────────────────────

class RemindersSyncSettingsTab extends obsidian.PluginSettingTab {
	constructor(app, plugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display() {
		const { containerEl } = this;
		const { plugin } = this;
		containerEl.empty();

		new obsidian.Setting(containerEl)
			.setName('Sync interval (minutes)')
			.setDesc('How often to pull reminders from Apple Reminders')
			.addSlider(s => {
				s.setLimits(1, 30, 1)
					.setValue(plugin.settings.syncIntervalMinutes)
					.setDynamicTooltip()
					.onChange(async v => {
						plugin.settings.syncIntervalMinutes = v;
						await plugin.saveSettings();
					});
			});

		new obsidian.Setting(containerEl)
			.setName('Daily notes folder')
			.setDesc('Folder where your daily notes are stored')
			.addText(t => {
				t.setValue(plugin.settings.dailyNotesFolder)
					.onChange(async v => {
						plugin.settings.dailyNotesFolder = v;
						await plugin.saveSettings();
					});
			});

		new obsidian.Setting(containerEl)
			.setName('Excluded lists')
			.setDesc('Comma-separated Apple Reminders lists to skip')
			.addText(t => {
				t.setValue(plugin.settings.excludedLists.join(', '))
					.onChange(async v => {
						plugin.settings.excludedLists = v.split(',').map(s => s.trim()).filter(Boolean);
						await plugin.saveSettings();
					});
			});
	}
}

module.exports = RemindersSyncPlugin;
