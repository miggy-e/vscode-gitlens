import GraphContainer, {
	type CssVariables,
	type GraphColumnSetting as GKGraphColumnSetting,
	type GraphColumnsSettings as GKGraphColumnsSettings,
	type GraphRow,
	type GraphZoneType,
} from '@gitkraken/gitkraken-components';
import type { ReactElement } from 'react';
import React, { createElement, useEffect, useRef, useState } from 'react';
import type { GraphColumnConfig } from '../../../../config';
import type {
	CommitListCallback,
	GraphCompositeConfig,
	GraphRepository,
	State,
} from '../../../../plus/webviews/graph/protocol';

export interface GraphWrapperProps extends State {
	nonce?: string;
	subscriber: (callback: CommitListCallback) => () => void;
	onSelectRepository?: (repository: GraphRepository) => void;
	onColumnChange?: (name: string, settings: GraphColumnConfig) => void;
	onMoreCommits?: (limit?: number) => void;
	onDismissPreview?: () => void;
	onSelectionChange?: (selection: string[]) => void;
}

const getStyleProps = (
	mixedColumnColors: CssVariables | undefined,
): { cssVariables: CssVariables; themeOpacityFactor: number } => {
	const body = document.body;
	const computedStyle = window.getComputedStyle(body);

	return {
		cssVariables: {
			'--app__bg0': computedStyle.getPropertyValue('--color-background'),
			'--panel__bg0': computedStyle.getPropertyValue('--graph-panel-bg'),
			'--text-selected': computedStyle.getPropertyValue('--color-foreground'),
			'--text-normal': computedStyle.getPropertyValue('--color-foreground--85'),
			'--text-secondary': computedStyle.getPropertyValue('--color-foreground--65'),
			'--text-disabled': computedStyle.getPropertyValue('--color-foreground--50'),
			'--text-accent': computedStyle.getPropertyValue('--color-link-foreground'),
			'--text-inverse': computedStyle.getPropertyValue('--vscode-input-background'),
			'--text-bright': computedStyle.getPropertyValue('--vscode-input-background'),
			...mixedColumnColors,
		},
		themeOpacityFactor: parseInt(computedStyle.getPropertyValue('--graph-theme-opacity-factor')) || 1,
	};
};

const defaultGraphColumnsSettings: GKGraphColumnsSettings = {
	commitAuthorZone: { width: 110 },
	commitDateTimeZone: { width: 130 },
	commitMessageZone: { width: 130 },
	commitZone: { width: 170 },
	refZone: { width: 150 },
};

const getGraphColSettingsModel = (config?: GraphCompositeConfig): GKGraphColumnsSettings => {
	const columnsSettings: GKGraphColumnsSettings = { ...defaultGraphColumnsSettings };
	if (config?.columns !== undefined) {
		for (const column of Object.keys(config.columns)) {
			columnsSettings[column] = {
				width: config.columns[column].width,
			};
		}
	}
	return columnsSettings;
};

type DebouncableFn = (...args: any) => void;
type DebouncedFn = (...args: any) => void;
const debounceFrame = (func: DebouncableFn): DebouncedFn => {
	let timer: number;
	return function (...args: any) {
		if (timer) cancelAnimationFrame(timer);
		timer = requestAnimationFrame(() => {
			func(...args);
		});
	};
};

const createIconElements = (): { [key: string]: ReactElement<any> } => {
	const iconList = [
		'head',
		'remote',
		'tag',
		'stash',
		'check',
		'loading',
		'warning',
		'added',
		'modified',
		'deleted',
		'renamed',
		'resolved',
	];
	const elementLibrary: { [key: string]: ReactElement<any> } = {};
	iconList.forEach(iconKey => {
		elementLibrary[iconKey] = createElement('span', { className: `graph-icon icon--${iconKey}` });
	});
	return elementLibrary;
};

const iconElementLibrary = createIconElements();

const getIconElementLibrary = (iconKey: string) => {
	return iconElementLibrary[iconKey];
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export function GraphWrapper({
	subscriber,
	repositories = [],
	rows = [],
	selectedRepository,
	config,
	log,
	onSelectRepository,
	onColumnChange,
	onMoreCommits,
	onSelectionChange,
	nonce,
	mixedColumnColors,
	previewBanner = true,
	onDismissPreview,
}: GraphWrapperProps) {
	const [graphList, setGraphList] = useState(rows);
	const [reposList, setReposList] = useState(repositories);
	const [currentRepository, setCurrentRepository] = useState<GraphRepository | undefined>(
		reposList.find(item => item.path === selectedRepository),
	);
	const [graphColSettings, setGraphColSettings] = useState(getGraphColSettingsModel(config));
	const [logState, setLogState] = useState(log);
	const [isLoading, setIsLoading] = useState(false);
	const [styleProps, setStyleProps] = useState(getStyleProps(mixedColumnColors));
	// TODO: application shouldn't know about the graph component's header
	const graphHeaderOffset = 24;
	const [mainWidth, setMainWidth] = useState<number>();
	const [mainHeight, setMainHeight] = useState<number>();
	const mainRef = useRef<HTMLElement>(null);
	const [showBanner, setShowBanner] = useState(previewBanner);
	// repo selection UI
	const [repoExpanded, setRepoExpanded] = useState(false);

	useEffect(() => {
		if (mainRef.current === null) {
			return;
		}

		const setDimensionsDebounced = debounceFrame((width, height) => {
			setMainWidth(Math.floor(width));
			setMainHeight(Math.floor(height) - graphHeaderOffset);
		});

		const resizeObserver = new ResizeObserver(entries => {
			entries.forEach(entry => {
				setDimensionsDebounced(entry.contentRect.width, entry.contentRect.height);
			});
		});
		resizeObserver.observe(mainRef.current);

		return () => {
			resizeObserver.disconnect();
		};
	}, [mainRef]);

	function transformData(state: State) {
		setGraphList(state.rows ?? []);
		setReposList(state.repositories ?? []);
		setCurrentRepository(reposList.find(item => item.path === state.selectedRepository));
		setGraphColSettings(getGraphColSettingsModel(state.config));
		setLogState(state.log);
		setIsLoading(false);
		setStyleProps(getStyleProps(state.mixedColumnColors));
	}

	useEffect(() => {
		if (subscriber === undefined) {
			return;
		}
		return subscriber(transformData);
	}, []);

	const handleSelectRepository = (item: GraphRepository) => {
		if (item != null && item !== currentRepository) {
			onSelectRepository?.(item);
		}
		setRepoExpanded(false);
	};

	const handleToggleRepos = () => {
		if (currentRepository != null && reposList.length <= 1) return;
		setRepoExpanded(!repoExpanded);
	};

	const handleMoreCommits = () => {
		setIsLoading(true);
		onMoreCommits?.();
	};

	const handleOnColumnResized = (graphZoneType: GraphZoneType, columnSettings: GKGraphColumnSetting) => {
		onColumnChange?.(graphZoneType, { width: columnSettings.width });
	};

	const handleSelectGraphRows = (graphRows: GraphRow[]) => {
		onSelectionChange?.(graphRows.map(r => r.sha));
	};

	const handleDismissBanner = () => {
		setShowBanner(false);
		onDismissPreview?.();
	};

	return (
		<>
			{showBanner && (
				<section className="graph-app__banner">
					<div className="alert">
						<span className="alert__icon codicon codicon-search"></span>
						<div className="alert__content">
							<p className="alert__title">Preview Feature</p>
							<p className="alert__message">
								The Commit Graph is a ✨ GitLens+ feature currently in preview. It is freely available
								for local and public repos, while a paid account is required for use on private repos.
								We welcome your feedback in our{' '}
								<a href="https://github.com/gitkraken/vscode-gitlens/discussions/2158">
									Commit Graph discussion on GitHub
								</a>
								.
							</p>
						</div>
						<button className="alert__action" type="button" onClick={() => handleDismissBanner()}>
							<span className="codicon codicon-chrome-close"></span>
						</button>
					</div>
				</section>
			)}
			<main ref={mainRef} id="main" className="graph-app__main">
				{currentRepository !== undefined ? (
					<>
						{mainWidth !== undefined && mainHeight !== undefined && (
							<GraphContainer
								columnsSettings={graphColSettings}
								cssVariables={styleProps.cssVariables}
								// eslint-disable-next-line @typescript-eslint/ban-ts-comment
								//@ts-ignore - remove once the Graph component is updated to use the new API
								getExternalIcon={getIconElementLibrary}
								graphRows={graphList}
								height={mainHeight}
								hasMoreCommits={logState?.hasMore}
								isLoadingRows={isLoading}
								nonce={nonce}
								onColumnResized={handleOnColumnResized}
								onSelectGraphRows={handleSelectGraphRows}
								onShowMoreCommits={handleMoreCommits}
								width={mainWidth}
								themeOpacityFactor={styleProps.themeOpacityFactor}
							/>
						)}
					</>
				) : (
					<p>No repository is selected</p>
				)}
			</main>
			<footer className="actionbar graph-app__footer">
				<div className="actionbar__group">
					<div className="actioncombo">
						<button
							type="button"
							aria-controls="repo-actioncombo-list"
							aria-expanded={repoExpanded}
							aria-haspopup="listbox"
							id="repo-actioncombo-label"
							className="actioncombo__label"
							role="combobox"
							aria-activedescendant=""
							onClick={() => handleToggleRepos()}
						>
							<span className="codicon codicon-repo actioncombo__icon" aria-label="Repository "></span>
							{currentRepository?.formattedName ?? 'none selected'}
						</button>
						<div
							className="actioncombo__list"
							id="repo-actioncombo-list"
							role="listbox"
							tabIndex={-1}
							aria-labelledby="repo-actioncombo-label"
						>
							{reposList.length > 0 ? (
								reposList.map((item, index) => (
									<button
										type="button"
										className="actioncombo__item"
										role="option"
										data-value={item.path}
										id={`repo-actioncombo-item-${index}`}
										key={`repo-actioncombo-item-${index}`}
										aria-selected={item.path === currentRepository?.path}
										onClick={() => handleSelectRepository(item)}
										disabled={item.path === currentRepository?.path}
									>
										{item.formattedName}
									</button>
								))
							) : (
								<li
									className="actioncombo__item"
									role="option"
									id="repo-actioncombo-item-0"
									aria-selected="true"
								>
									None available
								</li>
							)}
						</div>
					</div>
					{graphList.length > 0 && (
						<span>
							{graphList.length} commit{graphList.length ? 's' : ''}
						</span>
					)}
					{isLoading && (
						<span className={'icon--loading'}/>
					)}
				</div>
				<div className="actionbar__group">
					<span className="badge">Preview</span>
				</div>
			</footer>
		</>
	);
}
