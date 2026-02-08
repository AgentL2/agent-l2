/**
 * X (Twitter) Integration
 * Post tweets, reply, DM, search, analytics
 */

import { BaseIntegration, ActionResult, Credentials, IntegrationAction, OAuthConfig } from '../base';

export class TwitterIntegration extends BaseIntegration {
  id = 'twitter';
  name = 'X (Twitter)';
  description = 'Post tweets, reply to mentions, send DMs, search, and view analytics';
  category = 'social' as const;
  icon = '𝕏';

  oauth: OAuthConfig = {
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    scopes: [
      'tweet.read',
      'tweet.write',
      'users.read',
      'dm.read',
      'dm.write',
      'follows.read',
      'follows.write',
      'offline.access',
    ],
  };

  actions: IntegrationAction[] = [
    {
      name: 'postTweet',
      description: 'Post a new tweet',
      parameters: {
        text: { type: 'string', description: 'Tweet content (max 280 chars)', required: true },
        replyTo: { type: 'string', description: 'Tweet ID to reply to', required: false },
        mediaIds: { type: 'array', description: 'Media IDs to attach', required: false },
      },
      returns: 'Tweet ID',
    },
    {
      name: 'deleteTweet',
      description: 'Delete a tweet',
      parameters: {
        tweetId: { type: 'string', description: 'Tweet ID to delete', required: true },
      },
    },
    {
      name: 'likeTweet',
      description: 'Like a tweet',
      parameters: {
        tweetId: { type: 'string', description: 'Tweet ID to like', required: true },
      },
    },
    {
      name: 'retweet',
      description: 'Retweet a tweet',
      parameters: {
        tweetId: { type: 'string', description: 'Tweet ID to retweet', required: true },
      },
    },
    {
      name: 'sendDM',
      description: 'Send a direct message',
      parameters: {
        userId: { type: 'string', description: 'Recipient user ID', required: true },
        text: { type: 'string', description: 'Message content', required: true },
      },
    },
    {
      name: 'search',
      description: 'Search for tweets',
      parameters: {
        query: { type: 'string', description: 'Search query', required: true },
        maxResults: { type: 'number', description: 'Max results (10-100)', required: false },
      },
      returns: 'Array of tweets',
    },
    {
      name: 'getMentions',
      description: 'Get mentions of the authenticated user',
      parameters: {
        maxResults: { type: 'number', description: 'Max results', required: false },
      },
      returns: 'Array of mention tweets',
    },
    {
      name: 'getUser',
      description: 'Get user profile by username',
      parameters: {
        username: { type: 'string', description: 'Twitter username', required: true },
      },
      returns: 'User profile object',
    },
    {
      name: 'follow',
      description: 'Follow a user',
      parameters: {
        userId: { type: 'string', description: 'User ID to follow', required: true },
      },
    },
  ];

  private baseUrl = 'https://api.twitter.com/2';

  async execute(action: string, params: Record<string, any>, credentials: Credentials): Promise<ActionResult> {
    const headers = {
      'Authorization': `Bearer ${credentials.accessToken}`,
      'Content-Type': 'application/json',
    };

    try {
      switch (action) {
        case 'postTweet': {
          const body: any = { text: params.text };
          if (params.replyTo) {
            body.reply = { in_reply_to_tweet_id: params.replyTo };
          }
          if (params.mediaIds) {
            body.media = { media_ids: params.mediaIds };
          }

          const response = await fetch(`${this.baseUrl}/tweets`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          const data = await response.json();
          if (!response.ok) throw new Error(data.detail || 'Failed to post tweet');

          return { success: true, data: data.data };
        }

        case 'deleteTweet': {
          const response = await fetch(`${this.baseUrl}/tweets/${params.tweetId}`, {
            method: 'DELETE',
            headers,
          });

          if (!response.ok) throw new Error('Failed to delete tweet');
          return { success: true };
        }

        case 'likeTweet': {
          // Need user ID for likes endpoint
          const meResponse = await fetch(`${this.baseUrl}/users/me`, { headers });
          const meData = await meResponse.json();
          
          const response = await fetch(`${this.baseUrl}/users/${meData.data.id}/likes`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ tweet_id: params.tweetId }),
          });

          if (!response.ok) throw new Error('Failed to like tweet');
          return { success: true };
        }

        case 'retweet': {
          const meResponse = await fetch(`${this.baseUrl}/users/me`, { headers });
          const meData = await meResponse.json();
          
          const response = await fetch(`${this.baseUrl}/users/${meData.data.id}/retweets`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ tweet_id: params.tweetId }),
          });

          if (!response.ok) throw new Error('Failed to retweet');
          return { success: true };
        }

        case 'sendDM': {
          const response = await fetch(`${this.baseUrl}/dm_conversations/with/${params.userId}/messages`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ text: params.text }),
          });

          const data = await response.json();
          if (!response.ok) throw new Error(data.detail || 'Failed to send DM');

          return { success: true, data: data.data };
        }

        case 'search': {
          const searchParams = new URLSearchParams({
            query: params.query,
            max_results: String(params.maxResults || 10),
            'tweet.fields': 'author_id,created_at,public_metrics',
          });

          const response = await fetch(`${this.baseUrl}/tweets/search/recent?${searchParams}`, {
            headers,
          });

          const data = await response.json();
          if (!response.ok) throw new Error(data.detail || 'Search failed');

          return { success: true, data: data.data };
        }

        case 'getMentions': {
          const meResponse = await fetch(`${this.baseUrl}/users/me`, { headers });
          const meData = await meResponse.json();
          
          const searchParams = new URLSearchParams({
            max_results: String(params.maxResults || 10),
            'tweet.fields': 'author_id,created_at,public_metrics',
          });

          const response = await fetch(
            `${this.baseUrl}/users/${meData.data.id}/mentions?${searchParams}`,
            { headers }
          );

          const data = await response.json();
          if (!response.ok) throw new Error(data.detail || 'Failed to get mentions');

          return { success: true, data: data.data };
        }

        case 'getUser': {
          const response = await fetch(
            `${this.baseUrl}/users/by/username/${params.username}?user.fields=description,public_metrics,profile_image_url`,
            { headers }
          );

          const data = await response.json();
          if (!response.ok) throw new Error(data.detail || 'User not found');

          return { success: true, data: data.data };
        }

        case 'follow': {
          const meResponse = await fetch(`${this.baseUrl}/users/me`, { headers });
          const meData = await meResponse.json();
          
          const response = await fetch(`${this.baseUrl}/users/${meData.data.id}/following`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ target_user_id: params.userId }),
          });

          if (!response.ok) throw new Error('Failed to follow user');
          return { success: true };
        }

        default:
          return { success: false, error: `Unknown action: ${action}` };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
