"""GitHub integration service."""
from github import Github, GithubException
from typing import Dict, List, Optional, Any
import base64


class GitHubService:
    """Service for GitHub API operations."""

    def __init__(self, access_token: Optional[str] = None):
        """Initialize GitHub client.

        Args:
            access_token: GitHub OAuth access token
        """
        self.client = Github(access_token) if access_token else None
        self.access_token = access_token

    def get_user_info(self) -> Dict[str, Any]:
        """Get authenticated user information.

        Returns:
            User information dict
        """
        if not self.client:
            raise ValueError("No access token provided")

        try:
            user = self.client.get_user()
            return {
                'login': user.login,
                'name': user.name,
                'email': user.email,
                'avatar_url': user.avatar_url,
            }
        except GithubException as e:
            raise RuntimeError(f"GitHub API error: {str(e)}")

    def list_repositories(self, sort: str = 'updated') -> List[Dict[str, Any]]:
        """List user's repositories.

        Args:
            sort: Sort method (updated, created, pushed, full_name)

        Returns:
            List of repository information
        """
        if not self.client:
            raise ValueError("No access token provided")

        try:
            user = self.client.get_user()
            repos = user.get_repos(sort=sort)

            return [
                {
                    'name': repo.name,
                    'full_name': repo.full_name,
                    'description': repo.description,
                    'private': repo.private,
                    'updated_at': repo.updated_at.isoformat() if repo.updated_at else None,
                    'default_branch': repo.default_branch,
                }
                for repo in repos[:100]  # Limit to 100 repos
            ]
        except GithubException as e:
            raise RuntimeError(f"GitHub API error: {str(e)}")

    def list_markdown_files(self, repo_full_name: str, path: str = '') -> List[Dict[str, Any]]:
        """List markdown files in repository.

        Args:
            repo_full_name: Repository full name (owner/repo)
            path: Directory path to list

        Returns:
            List of file/directory information
        """
        if not self.client:
            raise ValueError("No access token provided")

        try:
            repo = self.client.get_repo(repo_full_name)
            contents = repo.get_contents(path)

            if not isinstance(contents, list):
                contents = [contents]

            items = []
            for content in contents:
                item = {
                    'name': content.name,
                    'path': content.path,
                    'type': content.type,
                    'size': content.size if content.type == 'file' else None,
                }

                # Include only markdown files and directories
                if content.type == 'dir' or content.name.endswith(('.md', '.markdown', '.txt')):
                    items.append(item)

            return items

        except GithubException as e:
            raise RuntimeError(f"GitHub API error: {str(e)}")

    def get_file_content(self, repo_full_name: str, file_path: str) -> Dict[str, Any]:
        """Get file content from repository.

        Args:
            repo_full_name: Repository full name (owner/repo)
            file_path: Path to file

        Returns:
            File content and metadata
        """
        if not self.client:
            raise ValueError("No access token provided")

        try:
            repo = self.client.get_repo(repo_full_name)
            content = repo.get_contents(file_path)

            # Decode base64 content
            decoded_content = base64.b64decode(content.content).decode('utf-8')

            return {
                'content': decoded_content,
                'sha': content.sha,
                'path': content.path,
                'name': content.name,
                'size': content.size,
            }

        except GithubException as e:
            raise RuntimeError(f"GitHub API error: {str(e)}")

    def save_file(
        self,
        repo_full_name: str,
        file_path: str,
        content: str,
        message: str,
        sha: Optional[str] = None,
        branch: Optional[str] = None
    ) -> Dict[str, Any]:
        """Save file to repository.

        Args:
            repo_full_name: Repository full name (owner/repo)
            file_path: Path to file
            content: File content
            message: Commit message
            sha: File SHA (required for updates)
            branch: Branch name (optional)

        Returns:
            Commit information
        """
        if not self.client:
            raise ValueError("No access token provided")

        try:
            repo = self.client.get_repo(repo_full_name)

            if sha:
                # Update existing file
                result = repo.update_file(
                    path=file_path,
                    message=message,
                    content=content,
                    sha=sha,
                    branch=branch
                )
            else:
                # Create new file
                result = repo.create_file(
                    path=file_path,
                    message=message,
                    content=content,
                    branch=branch
                )

            return {
                'sha': result['commit'].sha,
                'message': message,
                'path': file_path,
            }

        except GithubException as e:
            raise RuntimeError(f"GitHub API error: {str(e)}")
