import { ViewColumn, window } from 'vscode';
import { configuration, GraphConfig } from '../../../configuration';
import { Commands } from '../../../constants';
import type { Container } from '../../../container';
import type { GitLog } from '../../../git/models/log';
import { RepositoryPicker } from '../../../quickpicks/repositoryPicker';
import { WebviewWithConfigBase } from '../../../webviews/webviewWithConfigBase';
import { ensurePlusFeaturesEnabled } from '../../subscription/utils';
import type { GitCommit, Repository, State } from './protocol';

export class GraphWebview extends WebviewWithConfigBase<State> {
	private selectedRepository?: string;
	private currentLog?: GitLog;

	constructor(container: Container) {
		super(container, 'gitlens.graph', 'graph.html', 'images/gitlens-icon.png', 'Graph', Commands.ShowGraphPage);
	}

	override async show(column: ViewColumn = ViewColumn.Active): Promise<void> {
		if (!(await ensurePlusFeaturesEnabled())) return;
		return super.show(column);
	}

	private getRepos(): Repository[] {
		return this.container.git.openRepositories;
	}

	private async getLog(repo: string | Repository): Promise<GitLog | undefined> {
		const repository = typeof repo === 'string' ? this.container.git.getRepository(repo) : repo;
		if (repository === undefined) {
			return undefined;
		}

		const { defaultLimit, pageLimit } = this.getConfig();
		return this.container.git.getLog(repository.uri, {
			limit: pageLimit ?? defaultLimit,
		});
	}

	private async getCommits(repo?: string | Repository): Promise<{ log: GitLog; commits: GitCommit[] } | undefined> {
		if (repo === undefined) {
			return undefined;
		}

		const [currentUser, log, remotes, tags, branches] = await Promise.all([
			this.container.git.getCurrentUser(repo as string),
			this.getLog(repo as string),
			this.container.git.getRemotes(repo as string),
			this.container.git.getTags(repo as string),
			this.container.git.getBranches(repo as string),
		]);

        if (log == null || log?.commits === undefined) {
			return undefined;
        }

		const name = currentUser?.name ? `${currentUser.name} (you)` : 'You';

		const commitList: any[] = [];
		console.log('zzz log', log)	;
		console.log('zzz remotes', remotes);
		console.log('zzz tags', tags);
		console.log('zzz branches', branches);

		for (const commit of log.commits.values()) {
			// console.log('commitz', commit);
			const commitBranch = branches.values.find(b => b.sha === commit.sha);
			let branchInfo = {} as any;
			if (commitBranch != null) {
				branchInfo = {
					remotes: [
					{
						name: commitBranch.name,
						url: commitBranch.id
					}
					]
				};
				if (commitBranch.current) {
					branchInfo.heads = [
						{
							name: commitBranch.name,
							isCurrentHead: true
						}
					];
				}
			}
			const commitTag = tags.values.find(t => t.sha === commit.sha);
			let tagInfo = {} as any;
			if (commitTag != null) {
				tagInfo = { tags: [
						{
							name: commitTag.name,
						}
					]
				};
			}
			commitList.push({
				sha: commit.sha,
				parents: commit.parents,
				author: commit.author.name === 'You' ? name : commit.author.name,
				date: commit.date.getTime(),
				message: commit.message ?? commit.summary,
				email: commit.author.email,
				type: 'commit-node',
				... branchInfo,
				... tagInfo,
			});
		}

		commitList.sort((a, b) => b.date - a.date);

		return {
			log: log,
			commits: commitList,
		};
	}

	private async pickRepository(repositories: Repository[]): Promise<Repository | undefined> {
		if (repositories.length === 0) {
			return undefined;
		}

		if (repositories.length === 1) {
			return repositories[0];
		}

		const repoPath = (
			await RepositoryPicker.getBestRepositoryOrShow(
				undefined,
				window.activeTextEditor,
				'Choose a repository to visualize',
			)
		)?.path;

		return repositories.find(r => r.path === repoPath);
	}

	private getConfig(): GraphConfig {
		return configuration.get('graph');
	}

	private async getState(): Promise<State> {
		const repositories = this.getRepos();
		if (repositories.length === 0) {
			return {
				repositories: [],
			};
		}

		if (this.selectedRepository === undefined) {
			const idealRepo = await this.pickRepository(repositories);
			this.selectedRepository = idealRepo?.path;
		}

		const commitsAndLog = await this.getCommits(this.selectedRepository);

		const log = commitsAndLog?.log;

		return {
			repositories: formatRepositories(repositories),
			selectedRepository: this.selectedRepository,
			commits: formatCommits(commitsAndLog?.commits ?? []),
			config: this.getConfig(),
			log:
				log != null
					? {
							count: log.count,
							limit: log.limit,
							hasMore: log.hasMore,
							cursor: log.cursor,
					  }
					: undefined,
			nonce: super.getCSPNonce()
		};
	}

	protected override async includeBootstrap(): Promise<State> {
		return this.getState();
	}
}

function formatCommits(commits: GitCommit[]): GitCommit[] {
	return commits;
	// return commits.map(({ sha, author, message }) => ({
	// 	sha: sha,
	// 	author: author,
	// 	message: message,
	// }));
}

function formatRepositories(repositories: Repository[]): Repository[] {
	if (repositories.length === 0) {
		return repositories;
	}

	return repositories.map(({ formattedName, id, name, path }) => ({
		formattedName: formattedName,
		id: id,
		name: name,
		path: path,
	}));
}
