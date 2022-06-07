'use strict';
/*global*/
import './graph.scss';
import { provideVSCodeDesignSystem, vsCodeButton, vsCodeDropdown, vsCodeOption } from '@vscode/webview-ui-toolkit';
import {
	DidChangeStateNotificationType,
	OpenDataPointCommandType,
	State,
	UpdatePeriodCommandType,
} from '../../../../plus/webviews/timeline/protocol';
import { SubscriptionPlanId, SubscriptionState } from '../../../../subscription';
import { ExecuteCommandType, IpcMessage, onIpc } from '../../../protocol';
import { App } from '../../shared/appBase';
import { DOM } from '../../shared/dom';
import { DataPointClickEvent, TimelineChart } from './chart';

export class GraphApp extends App<State> {
	private _chart: TimelineChart | undefined;
	private _graph: HTMLElement | null | undefined;
	private _messages: HTMLElement | null | undefined;
	private _commits: HTMLElement | null | undefined;
	private times = 0;

	constructor() {
		super('GraphApp');
	}

	protected override onInitialize() {
		this._graph = document.getElementById('graph');
		this._messages = document.getElementById('messages');
		this._commits = document.getElementById('commits');
		if (this._messages != null){
			this._messages.append('GraphApp initialized');
			const $newmessage = document.createElement('div');
			$newmessage.textContent = 'New message';
			this._messages.append($newmessage);

			const $newmessage2 = document.createElement('div');
			$newmessage2.textContent = 'New message2';
			this._messages.append($newmessage2);
		}
		if (this._commits != null){
			this._commits.textContent = 'COMMITS';
		}
		provideVSCodeDesignSystem().register({
			register: function (container: any, context: any) {
				vsCodeButton().register(container, context);
				vsCodeDropdown().register(container, context);
				vsCodeOption().register(container, context);
			},
		});

		this.updateState();
	}

	protected override onBind() {
		const disposables = super.onBind?.() ?? [];

		disposables.push(
			DOM.on('[data-action]', 'click', (e, target: HTMLElement) => this.onActionClicked(e, target)),
			DOM.on(document, 'keydown', (e: KeyboardEvent) => this.onKeyDown(e)),
			DOM.on(document.getElementById('periods')! as HTMLSelectElement, 'change', (e, target) =>
				this.onPeriodChanged(e, target),
			),
		);

		return disposables;

	}

	protected override onMessageReceived(e: MessageEvent) {
		const msg = e.data as IpcMessage;
		const $message = document.getElementById('messages')!;
		$message.append(`<div>${JSON.stringify(msg)}</div>`);

		switch (msg.method) {
			case DidChangeStateNotificationType.method:
				this.log(`${this.appName}.onMessageReceived(${msg.id}): name=${msg.method}`);

				onIpc(DidChangeStateNotificationType, msg, params => {
					this.state = params.state;
					this.updateState();
				});
				break;

			default:
				super.onMessageReceived?.(e);
		}
	}

	private onActionClicked(e: MouseEvent, target: HTMLElement) {
		const action = target.dataset.action;
		if (action?.startsWith('command:')) {
			this.sendCommand(ExecuteCommandType, { command: action.slice(8) });
		}
	}

	private onChartDataPointClicked(e: DataPointClickEvent) {
		this.sendCommand(OpenDataPointCommandType, e);
	}

	private onKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape' || e.key === 'Esc') {
			this._chart?.reset();
		}
	}

	private onPeriodChanged(e: Event, element: HTMLSelectElement) {
		const value = element.options[element.selectedIndex].value;
		assertPeriod(value);

		this.log(`${this.appName}.onPeriodChanged: name=${element.name}, value=${value}`);

		this.sendCommand(UpdatePeriodCommandType, { period: value });
	}

	private updateState(): void {
		// if (this._graph != null){
		// 	this._graph.textContent = `updated state ${this.times}`;
		// 	this.times = this.times + 1;
		// }
		if (this._graph != null){
			this._graph.textContent = `updated state: \n${JSON.stringify(this.state, null, 2)}`;
		}
		if (this._commits != null && this.state.dataset?.length){
			for (const commit of this.state.dataset){
				console.log('zz testing', commit);
				const $newcommit = document.createElement('div');
				$newcommit.textContent = `${JSON.stringify(commit, null, 2)}`;
				this._commits.append($newcommit);
			}
		} else if (this._commits != null){
				this._commits.textContent = JSON.stringify(this.state.dataset, null, 2);
		}

		const $overlay = document.getElementById('overlay') as HTMLDivElement;
		$overlay.classList.toggle('hidden', this.state.access.allowed);

		const $slot = document.getElementById('overlay-slot') as HTMLDivElement;

		if (!this.state.access.allowed) {
			const { current: subscription, required } = this.state.access.subscription;

			const requiresPublic = required === SubscriptionPlanId.FreePlus;
			const options = { visible: { public: requiresPublic, private: !requiresPublic } };

			if (subscription.account?.verified === false) {
				DOM.insertTemplate('state:verify-email', $slot, options);
				return;
			}

			switch (subscription.state) {
				case SubscriptionState.Free:
					DOM.insertTemplate('state:free', $slot, options);
					break;
				case SubscriptionState.FreePreviewExpired:
					DOM.insertTemplate('state:free-preview-expired', $slot, options);
					break;
				case SubscriptionState.FreePlusTrialExpired:
					DOM.insertTemplate('state:plus-trial-expired', $slot, options);
					break;
			}

			if (this.state.dataset == null) return;
		} else {
			$slot.innerHTML = '';
		}

		if (this._chart == null) {
			this._chart = new TimelineChart('#chart');
			this._chart.onDidClickDataPoint(this.onChartDataPointClicked, this);
		}

		let { title } = this.state;

		const empty = this.state.dataset == null || this.state.dataset.length === 0;
		if (empty) {
			title = '';
		}

		let description = '';
		const index = title.lastIndexOf('/');
		if (index >= 0) {
			const name = title.substring(index + 1);
			description = title.substring(0, index);
			title = name;
		}

		for (const [key, value] of Object.entries({ title: title, description: description })) {
			const $el = document.querySelector(`[data-bind="${key}"]`);
			if ($el != null) {
				$el.textContent = String(value);
			}
		}

		const $periods = document.getElementById('periods') as HTMLSelectElement;
		if ($periods != null) {
			const period = this.state?.period;
			for (let i = 0, len = $periods.options.length; i < len; ++i) {
				if ($periods.options[i].value === period) {
					$periods.selectedIndex = i;
					break;
				}
			}
		}

		this._chart.updateChart(this.state);
	}
}

function assertPeriod(period: string): asserts period is `${number}|${'D' | 'M' | 'Y'}` {
	const [value, unit] = period.split('|');
	if (isNaN(Number(value)) || (unit !== 'D' && unit !== 'M' && unit !== 'Y')) {
		throw new Error(`Invalid period: ${period}`);
	}
}

new GraphApp();
