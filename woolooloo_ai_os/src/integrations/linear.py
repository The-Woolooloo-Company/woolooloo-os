import httpx
from typing import Optional
from ..config import get_settings


class LinearClient:
    def __init__(self):
        self.settings = get_settings()
        self.base_url = "https://api.linear.app/graphql"
        self._client: Optional[httpx.AsyncClient] = None

    @property
    def client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                headers={
                    "Authorization": f"Bearer {self.settings.LINEAR_API_KEY}",
                    "Content-Type": "application/json",
                },
                timeout=30.0,
            )
        return self._client

    async def gql(self, query: str, variables: Optional[dict] = None):
        response = await self.client.post(
            "",
            json={"query": query, "variables": variables or {}},
        )
        response.raise_for_status()
        data = response.json()
        if "errors" in data:
            raise Exception(f"GraphQL error: {data['errors']}")
        return data.get("data", {})

    async def get_issue(self, issue_id: str):
        query = """
        query GetIssue($issueId: String!) {
            issue(id: $issueId) {
                id
                identifier
                title
                description
                state {
                    name
                    type
                }
                assignee {
                    id
                    name
                    email
                }
                labels {
                    nodes {
                        name
                    }
                }
                priority
                createdAt
                updatedAt
            }
        }
        """
        return await self.gql(query, {"issueId": issue_id})

    async def get_issues(
        self,
        team_id: Optional[str] = None,
        labels: Optional[list[str]] = None,
        assignee: Optional[str] = None,
    ):
        where_clause = "{}"
        if team_id or labels or assignee:
            where_parts = []
            if team_id:
                where_parts.append(f'teamId: "{team_id}"')
            if labels:
                label_filter = ", ".join([f'name: "{l}"' for l in labels])
                where_parts.append(f'labels: {{ nodes: {{ {label_filter} }} }}')
            if assignee:
                where_parts.append(f'assigneeId: "{assignee}"')
            where_clause = "{" + ", ".join(where_parts) + "}"

        query = f"""
        query GetIssues($first: Int, $after: String) {{
            issues(first: $first, after: $after, filter: {where_clause}) {{
                nodes {{
                    id
                    identifier
                    title
                    description
                    state {{
                        name
                        type
                    }}
                    assignee {{
                        id
                        name
                    }}
                    labels {{
                        nodes {{ name }}
                    }}
                    priority
                    createdAt
                    updatedAt
                }}
                pageInfo {{
                    hasNextPage
                    endCursor
                }}
            }}
        }}
        """
        return await self.gql(query, {"first": 50})

    async def create_issue(
        self,
        title: str,
        description: Optional[str] = None,
        team_id: Optional[str] = None,
        assignee_id: Optional[str] = None,
        label_ids: Optional[list[str]] = None,
        priority: Optional[int] = None,
    ):
        mutation = """
        mutation CreateIssue($input: IssueCreateInput!) {
            issueCreate(input: $input) {
                success
                issue {
                    id
                    identifier
                    title
                }
            }
        }
        """
        input_data = {"title": title}
        if description:
            input_data["description"] = description
        if team_id:
            input_data["teamId"] = team_id
        if assignee_id:
            input_data["assigneeId"] = assignee_id
        if label_ids:
            input_data["labelIds"] = label_ids
        if priority:
            input_data["priority"] = priority

        return await self.gql(mutation, {"input": input_data})

    async def update_issue(
        self,
        issue_id: str,
        title: Optional[str] = None,
        description: Optional[str] = None,
        state_id: Optional[str] = None,
        assignee_id: Optional[str] = None,
        priority: Optional[int] = None,
    ):
        mutation = """
        mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
            issueUpdate(id: $id, input: $input) {
                success
            }
        }
        """
        input_data = {}
        if title is not None:
            input_data["title"] = title
        if description is not None:
            input_data["description"] = description
        if state_id:
            input_data["stateId"] = state_id
        if assignee_id:
            input_data["assigneeId"] = assignee_id
        if priority is not None:
            input_data["priority"] = priority

        return await self.gql(mutation, {"id": issue_id, "input": input_data})

    async def add_comment(
        self,
        issue_id: str,
        body: str,
    ):
        mutation = """
        mutation CreateComment($input: CommentCreateInput!) {
            commentCreate(input: $input) {
                success
                comment {
                    id
                    body
                    createdAt
                }
            }
        }
        """
        return await self.gql(
            mutation, {"input": {"issueId": issue_id, "body": body}}
        )

    async def get_teams(self):
        query = """
        query GetTeams {
            teams {
                nodes {
                    id
                    name
                    key
                }
            }
        }
        """
        return await self.gql(query)

    async def close(self):
        if self._client:
            await self._client.aclose()


linear_client = LinearClient()


def get_agent_for_linear_action(action: str, payload: dict) -> Optional[str]:
    action_to_agent = {
        "create": "product",
        "update": "product",
        "comment": "dev",
    }

    data = payload.get("data", {})
    labels = data.get("labels", {}).get("nodes", [])
    label_names = [l.get("name", "").lower() for l in labels]

    if "dev" in label_names or "dev-task" in label_names:
        return "dev"
    if "product" in label_names:
        return "product"
    if "growth" in label_names or "campaign" in label_names:
        return "growth"
    if "sales" in label_names:
        return "sales"
    if "ops" in label_names:
        return "ops"

    return action_to_agent.get(action)