# Maitea Wechat Mini-Program

## Api Example

### Get profile
Example request:
```javascript
const url = new URL(
    "https://maitea.app/api/v1/profiles"
);

const headers = {
    "Authorization": "Bearer {YOUR_AUTH_KEY}",
    "Content-Type": "application/json",
    "Accept": "application/json",
};

fetch(url, {
    method: "GET",
    headers,
}).then(response => response.json());
```
Example response (200, Success):
```json
{
    "data": [
        {
            "id": 1,
            "name": "Ｔｅｓｔ☆",
            "rating": 100,
            "rating_highest": 200,
            "level": 1,
            "play_stats": {
                "total": 20,
                "wins": 10,
                "vs": 10,
                "sync": 10,
                "first": {
                    "id": 1,
                    "date": "2023-01-01T00:00:00.000000Z",
                    "date_unix": 1672531200
                },
                "latest": {
                    "id": 2,
                    "date": "2023-01-01T00:00:00.000000Z",
                    "date_unix": 1672531200
                }
            },
            "options": {
                "icon": {
                    "id": 0,
                    "png": "0000.png",
                    "webp": "0000.webp"
                },
                "icon_deka": null,
                "nameplate": {
                    "id": 0,
                    "png": "0000.png",
                    "webp": "0000.webp"
                },
                "frame": {
                    "id": 0,
                    "png": "0000.png",
                    "webp": "0000.webp"
                }
            },
            "is_primary": true
        }
    ]
}
```
Example response (401, Invalid or expired access token):
```json
{
    "message": "Unauthenticated."
}
```

Example response (403, Accessing a resource not owned by the user):
```json
{
    "message": "This action is unauthorized."
}
```

### Get play records by page
Example request:
```javascript
const url = new URL(
    "https://maitea.app/api/v1/plays"
);

const params = {
    "profile": "1",
    "page": "1"
};
Object.keys(params)
    .forEach(key => url.searchParams.append(key, params[key]));

const headers = {
    "Authorization": "Bearer {YOUR_AUTH_KEY}",
    "Content-Type": "application/json",
    "Accept": "application/json",
};

let body = {
    "fields": [
        "id",
        "achievement_formatted",
        "track",
        "score_formatted",
        "score_detail",
        "rank",
        "full_combo",
        "full_combo_label",
        "is_high_score",
        "is_all_perfect",
        "is_track_skip",
        "difficulty_level",
        "play_date",
        "location",
        "song"
    ]
};

fetch(url, {
    method: "GET",
    headers,
    body: JSON.stringify(body),
}).then(response => response.json());
```
Example response (200, Success):
```json
{
    "data": [
        {
            "id": 1,
            "achievement_formatted": "80.00",
            "track": 1,
            "score_formatted": "100,000",
            "score_detail": {
                "hits": {
                    "perfect": 10,
                    "great": 10,
                    "good": 10,
                    "bad": 10
                },
                "tap": {
                    "perfect": 10,
                    "great": 10,
                    "good": 10,
                    "bad": 10
                },
                "hold": {
                    "perfect": 10,
                    "great": 10,
                    "good": 10,
                    "bad": 10
                },
                "slide": {
                    "perfect": 10,
                    "great": 10,
                    "good": 10,
                    "bad": 10
                },
                "break": {
                    "perfect": 10,
                    "great": 10,
                    "good": 10,
                    "bad": 10
                }
            },
            "rank": "AAA",
            "full_combo": 0,
            "full_combo_label": null,
            "is_high_score": false,
            "is_all_perfect": false,
            "is_track_skip": false,
            "difficulty_level": {
                "key": 1,
                "value": "basic",
                "label": "BASIC"
            },
            "play_date": "2023-01-01T00:00:00.000000Z",
            "location": "Arcade",
            "song": {
                "id": 1,
                "code": "example_1",
                "name": {
                    "en": "Example 1",
                    "jp": "なになに1"
                },
                "artist": {
                    "en": "John Doe",
                    "jp": "山田太郎"
                }
            }
        },
        {
            "id": 2,
            "achievement_formatted": "100.00",
            "track": 2,
            "score_formatted": "500,000",
            "score_detail": {
                "hits": {
                    "perfect": 100,
                    "great": 0,
                    "good": 0,
                    "bad": 0
                },
                "tap": {
                    "perfect": 100,
                    "great": 0,
                    "good": 0,
                    "bad": 0
                },
                "hold": {
                    "perfect": 100,
                    "great": 0,
                    "good": 0,
                    "bad": 0
                },
                "slide": {
                    "perfect": 100,
                    "great": 0,
                    "good": 0,
                    "bad": 0
                },
                "break": {
                    "perfect": 100,
                    "great": 0,
                    "good": 0,
                    "bad": 0
                }
            },
            "rank": "SSS+",
            "full_combo": 2,
            "full_combo_label": "Full Combo +",
            "is_high_score": true,
            "is_all_perfect": true,
            "is_track_skip": false,
            "difficulty_level": {
                "key": 6,
                "value": "remaster",
                "label": "Re:MASTER"
            },
            "play_date": "2023-01-01T00:00:00.000000Z",
            "location": "Arcade",
            "song": {
                "id": 1,
                "code": "example_1",
                "name": {
                    "en": "Example 1",
                    "jp": "なになに1"
                },
                "artist": {
                    "en": "John Doe",
                    "jp": "山田太郎"
                }
            }
        }
    ]
}
```

Example response (401, Invalid or expired access token):
```json
{
    "message": "Unauthenticated."
}

```

Example response (403, Accessing a resource not owned by the user):
```json
{
    "message": "This action is unauthorized."
}
```