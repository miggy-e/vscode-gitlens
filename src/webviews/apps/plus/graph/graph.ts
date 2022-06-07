'use strict';
/*global*/
import './graph.scss';
import {
	DidChangeStateNotificationType,
	State,} from '../../../../plus/webviews/graph/protocol';
import { IpcMessage, onIpc } from '../../../protocol';
import { App } from '../../shared/appBase';
import { DOM } from '../../shared/dom';

export class GraphApp extends App<State> {
	private _graph: HTMLElement | null | undefined;
	private _messages: HTMLElement | null | undefined;
	private _commits: HTMLElement | null | undefined;

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
		// provideVSCodeDesignSystem().register({
		// 	register: function (container: any, context: any) {
		// 		vsCodeButton().register(container, context);
		// 		vsCodeDropdown().register(container, context);
		// 		vsCodeOption().register(container, context);
		// 	},
		// });

		this.updateState();
	}

	protected override onBind() {
		const disposables = super.onBind?.() ?? [];

		disposables.push(
			DOM.on('[data-action]', 'click', (e, target: HTMLElement) => this.onActionClicked(e, target)),
			DOM.on(document, 'keydown', (e: KeyboardEvent) => this.onKeyDown(e)),
			// DOM.on(document.getElementById('periods')! as HTMLSelectElement, 'change', (e, target) =>
			// 	// this.onPeriodChanged(e, target),
			// ),
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
		console.log('onActionClicked', e, target);
		// const action = target.dataset.action;
		// if (action?.startsWith('command:')) {
		// 	this.sendCommand(ExecuteCommandType, { command: action.slice(8) });
		// }
	}

	private onKeyDown(e: KeyboardEvent) {
		console.log('keydown', e);
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
	}
}

new GraphApp();
