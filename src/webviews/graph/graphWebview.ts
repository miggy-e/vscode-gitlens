import { ViewColumn } from 'vscode';
import { Commands } from '../../constants';
import type { Container } from '../../container';
import { find } from '../../system/iterable';
import { WebviewBase } from '../webviewBase';
import type { GitCommit, Repository, State } from './protocol';



export class GraphWebview extends WebviewBase<State> {
	private selectedRepository?: string;

	constructor(container: Container) {
		super(
			container,
			'gitlens.graph',
			'graph.html',
			'images/gitlens-icon.png',
			'Graph',
			Commands.ShowGraphPage,
		);
	}

	private getRepos(): Repository[] {
		return this.container.git.openRepositories;
	}

	private async getCommits(repo?: string | Repository): Promise<GitCommit[]> {
		if (repo === undefined) {
			return [];
		}

		const repository = typeof repo === 'string' ? this.container.git.getRepository(repo) : repo;
		if (repository === undefined) {
			return [];
		}

		const [currentUser, log, remotes, tags, branches] = await Promise.all([
			this.container.git.getCurrentUser(repo as string),
			this.container.git.getLog(repo as string),
			this.container.git.getRemotes(repo as string),
			this.container.git.getTags(repo as string),
			this.container.git.getBranches(repo as string),
		]);

		if (log == null) {
			return [];
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

		return commitList;
	}

	private async getState(): Promise<State> {
		const repositories = this.getRepos();
		if (repositories.length === 0) {
			return {
				repositories: [],
				commits: [],
			};
		}

		if (this.selectedRepository === undefined) {
			this.selectedRepository = repositories[0].path;
		}

		const commits = await this.getCommits(this.selectedRepository);

		return {
			repositories: formatRepositories(repositories),
			selectedRepository: this.selectedRepository,
			commits: formatCommits(commits),
			nonce: super.getCSPNonce()
		};
	}

	protected override async includeBootstrap(): Promise<State> {
		return this.getState();
	}

	override async show(column: ViewColumn = ViewColumn.Active): Promise<void> {
		return super.show(column);
	}
}

function formatCommits(commits: GitCommit[]): GitCommit[] {
	return commits;
	// return commits.map(({ sha, author, message }) => ({
	// 	sha: sha,
	// 	author: author,
	// 	message: message
	// }));
}

function formatRepositories(repositories: Repository[]): Repository[] {
	if (repositories.length === 0) {
		return repositories;
	}

	return repositories.map(({ formattedName, id, name, path }) => ({ formattedName: formattedName, id: id, name: name, path: path }));
}
