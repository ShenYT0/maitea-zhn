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
```
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
                    "id": 1020,
                    "is_deka": false,
                    "png": "https://maitea.app/storage/user_icons/1020.png",
                    "webp": "https://maitea.app/storage/user_icons/1020.webp"
                },
                "icon_deka": {
                    "id": 1020,
                    "is_deka": true,
                    "png": "https://maitea.app/storage/user_icons_deka/1020.png",
                    "webp": "https://maitea.app/storage/user_icons_deka/1020.webp"
                },
                "nameplate": {
                    "id": 331,
                    "png": "https://maitea.app/storage/user_nameplates/0331.png",
                    "webp": "https://maitea.app/storage/user_nameplates/0331.webp"
                },
                "frame": {
                    "id": 461,
                    "png": "https://maitea.app/storage/user_frames/0461.png",
                    "webp": "https://maitea.app/storage/user_frames/0461.webp"
                },
                "title": {
                    "id": 0,
                    "value": "称号"
                }
            },
            "is_primary": true
        }
    ]
}
```
Example response (401, Invalid or expired access token):
```
{
    "message": "Unauthenticated."
}
```

Example response (403, Accessing a resource not owned by the user):
```
{
    "message": "This action is unauthorized."
}
```