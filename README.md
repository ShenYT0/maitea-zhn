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