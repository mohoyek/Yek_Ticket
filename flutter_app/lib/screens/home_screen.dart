import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/ticket_provider.dart';
import '../providers/theme_provider.dart';
import 'ticket_list_screen.dart';
import 'create_ticket_screen.dart';
import 'profile_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _selectedIndex = 0;

  final List<Widget> _screens = [
    const TicketListScreen(),
    const CreateTicketScreen(),
    const ProfileScreen(),
  ];

  @override
  void initState() {
    super.initState();
    // Fetch tickets on init
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<TicketProvider>(context, listen: false).fetchTickets();
    });
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final themeProvider = Provider.of<ThemeProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Support Ticket System'),
        actions: [
          // Theme Toggle
          IconButton(
            icon: Icon(themeProvider.isDarkMode ? Icons.light_mode : Icons.dark_mode),
            onPressed: () => themeProvider.toggleTheme(),
            tooltip: themeProvider.isDarkMode ? 'Light Mode' : 'Dark Mode',
          ),
          // User Menu
          PopupMenuButton<String>(
            onSelected: (value) {
              if (value == 'logout') {
                authProvider.logout();
              } else if (value == 'profile') {
                setState(() => _selectedIndex = 2);
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'profile',
                child: ListTile(
                  leading: Icon(Icons.person),
                  title: Text('Profile'),
                  contentPadding: EdgeInsets.zero,
                ),
              ),
              const PopupMenuItem(
                value: 'logout',
                child: ListTile(
                  leading: Icon(Icons.logout, color: Colors.red),
                  title: Text('Logout', style: TextStyle(color: Colors.red)),
                  contentPadding: EdgeInsets.zero,
                ),
              ),
            ],
          ),
        ],
      ),
      body: _screens[_selectedIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (index) => setState(() => _selectedIndex = index),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.list_outlined),
            selectedIcon: Icon(Icons.list),
            label: 'Tickets',
          ),
          NavigationDestination(
            icon: Icon(Icons.add_circle_outline),
            selectedIcon: Icon(Icons.add_circle),
            label: 'New Ticket',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
      floatingActionButton: _selectedIndex == 0
          ? FloatingActionButton.extended(
              onPressed: () => setState(() => _selectedIndex = 1),
              icon: const Icon(Icons.add),
              label: const Text('New Ticket'),
            )
          : null,
    );
  }
}
