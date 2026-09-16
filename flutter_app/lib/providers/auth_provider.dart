import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class AuthProvider extends ChangeNotifier {
  String? _token;
  Map<String, dynamic>? _user;
  bool _isLoading = false;

  String? get token => _token;
  Map<String, dynamic>? get user => _user;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _token != null && _token!.isNotEmpty;

  // API Base URL - Change this to your Node.js backend URL
  static const String baseUrl = 'http://localhost:3000/api';

  Future<void> login(String email, String password) async {
    _isLoading = true;
    notifyListeners();

    try {
      // TODO: Implement actual HTTP call to your backend
      // For now, simulating a successful login
      await Future.delayed(const Duration(seconds: 1));
      
      // Mock response - replace with actual API call
      _token = 'mock_jwt_token_12345';
      _user = {
        'id': '1',
        'email': email,
        'name': 'User Name',
        'role': 'user', // or 'admin', 'support'
      };

      // Save token locally
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('token', _token!);
      await prefs.setString('user', jsonEncode(_user));

    } catch (e) {
      _token = null;
      _user = null;
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    _token = null;
    _user = null;
    
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    await prefs.remove('user');
    
    notifyListeners();
  }

  Future<void> autoLogin() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');
    final userJson = prefs.getString('user');

    if (token != null && userJson != null) {
      _token = token;
      _user = jsonDecode(userJson);
      notifyListeners();
    }
  }

  bool hasRole(String role) {
    return _user?['role'] == role || _user?['role'] == 'admin';
  }
}
