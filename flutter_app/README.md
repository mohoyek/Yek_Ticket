# Support Ticket System - Flutter App

A complete ticketing and support system built with Flutter for Windows, Android, and iOS.

## Features

- ✅ User Authentication (Login/Logout)
- ✅ Create Support Tickets
- ✅ View Ticket List with Filters
- ✅ Ticket Details with Messages
- ✅ Update Ticket Status (Admin/Support)
- ✅ Dark Mode / Light Mode Toggle
- ✅ Profile Management
- ✅ Responsive UI for all platforms
- ✅ State Management with Provider
- ✅ Local Storage with SharedPreferences

## Project Structure

```
flutter_app/
├── lib/
│   ├── main.dart                 # App entry point
│   ├── models/
│   │   └── ticket.dart           # Data models
│   ├── providers/
│   │   ├── auth_provider.dart    # Authentication state
│   │   ├── ticket_provider.dart  # Ticket management
│   │   └── theme_provider.dart   # Theme management
│   ├── screens/
│   │   ├── login_screen.dart
│   │   ├── home_screen.dart
│   │   ├── ticket_list_screen.dart
│   │   ├── ticket_detail_screen.dart
│   │   ├── create_ticket_screen.dart
│   │   └── profile_screen.dart
│   └── widgets/                  # Reusable widgets
├── assets/
│   ├── images/
│   └── icons/
├── test/
└── pubspec.yaml
```

## Prerequisites

1. **Flutter SDK** (3.0.0 or higher)
   - Download from: https://docs.flutter.dev/get-started/install/windows
   
2. **Backend API** (Node.js/Express or any REST API)
   - The app expects API endpoints at `http://localhost:3000/api`
   - You can change this in `lib/providers/auth_provider.dart` and `lib/providers/ticket_provider.dart`

## Installation

### 1. Clone and Navigate

```bash
cd flutter_app
```

### 2. Get Dependencies

```bash
flutter pub get
```

### 3. Run the App

#### For Windows:
```bash
flutter run -d windows
```

#### For Android:
```bash
flutter run -d android
```

#### For iOS (macOS only):
```bash
flutter run -d ios
```

#### For Web:
```bash
flutter run -d chrome
```

## Configuration

### API Base URL

Update the API base URL in these files to match your backend:

- `lib/providers/auth_provider.dart` (line 15)
- `lib/providers/ticket_provider.dart` (line 14)

```dart
static const String baseUrl = 'http://localhost:3000/api';
```

### Backend Integration

The app currently uses mock data. To connect to your real backend:

1. Uncomment the HTTP calls in `AuthProvider.login()`
2. Implement actual API calls in `TicketProvider` methods
3. Handle authentication tokens properly

Example for login:

```dart
final response = await http.post(
  Uri.parse('$baseUrl/auth/login'),
  headers: {'Content-Type': 'application/json'},
  body: jsonEncode({'email': email, 'password': password}),
);

if (response.statusCode == 200) {
  final data = jsonDecode(response.body);
  _token = data['token'];
  _user = data['user'];
  // Save to SharedPreferences...
}
```

## Development

### Enable Windows Desktop

If you haven't enabled Windows desktop support:

```bash
flutter config --enable-windows-desktop
```

### Check Connected Devices

```bash
flutter devices
```

### Build Release

#### Windows:
```bash
flutter build windows --release
```

#### Android APK:
```bash
flutter build apk --release
```

#### Android App Bundle:
```bash
flutter build appbundle --release
```

## Testing

Run tests:

```bash
flutter test
```

## Troubleshooting

### Windows Build Issues

Make sure you have:
- Visual Studio 2022 with "Desktop development with C++" workload
- Windows 10 SDK (10.0.19041.0 or later)

### Common Issues

1. **Dependencies not found**: Run `flutter pub get`
2. **Build fails**: Run `flutter clean` then `flutter pub get`
3. **Hot reload not working**: Restart the app with `r`

## Next Steps

1. Set up your Node.js/Express backend
2. Connect the Flutter app to real API endpoints
3. Implement file upload for attachments
4. Add push notifications
5. Add offline support with Hive database
6. Implement real-time updates with WebSocket

## License

MIT License
