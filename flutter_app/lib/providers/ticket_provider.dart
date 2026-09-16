import 'package:flutter/material.dart';
import '../models/ticket.dart';

class TicketProvider extends ChangeNotifier {
  List<Ticket> _tickets = [];
  bool _isLoading = false;
  String? _error;

  List<Ticket> get tickets => _tickets;
  bool get isLoading => _isLoading;
  String? get error => _error;

  // API Base URL
  static const String baseUrl = 'http://localhost:3000/api';

  Future<void> fetchTickets({String? status, String? priority}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      // TODO: Implement actual HTTP call to your backend
      // Example:
      // final response = await http.get(
      //   Uri.parse('$baseUrl/tickets?status=$status&priority=$priority'),
      //   headers: {'Authorization': 'Bearer $token'},
      // );
      
      await Future.delayed(const Duration(seconds: 1));
      
      // Mock data - replace with actual API call
      _tickets = [
        Ticket(
          id: '1',
          title: 'Cannot login to account',
          description: 'I am unable to login to my account. Getting error 403.',
          status: 'open',
          priority: 'high',
          userId: 'user123',
          createdAt: DateTime.now().subtract(const Duration(hours: 2)),
          updatedAt: DateTime.now(),
        ),
        Ticket(
          id: '2',
          title: 'Feature request: Dark mode',
          description: 'Please add dark mode to the application.',
          status: 'in_progress',
          priority: 'medium',
          userId: 'user456',
          createdAt: DateTime.now().subtract(const Duration(days: 1)),
          updatedAt: DateTime.now(),
        ),
        Ticket(
          id: '3',
          title: 'Payment issue',
          description: 'My payment was deducted but ticket not created.',
          status: 'resolved',
          priority: 'urgent',
          userId: 'user789',
          createdAt: DateTime.now().subtract(const Duration(days: 3)),
          updatedAt: DateTime.now(),
        ),
      ];

    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> createTicket({
    required String title,
    required String description,
    required String priority,
  }) async {
    _isLoading = true;
    notifyListeners();

    try {
      // TODO: Implement actual HTTP call to your backend
      await Future.delayed(const Duration(seconds: 1));
      
      final newTicket = Ticket(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        title: title,
        description: description,
        status: 'open',
        priority: priority,
        userId: 'current_user',
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      _tickets.insert(0, newTicket);
    } catch (e) {
      _error = e.toString();
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> updateTicketStatus(String ticketId, String status) async {
    _isLoading = true;
    notifyListeners();

    try {
      // TODO: Implement actual HTTP call to your backend
      await Future.delayed(const Duration(milliseconds: 500));
      
      final index = _tickets.indexWhere((t) => t.id == ticketId);
      if (index != -1) {
        // Create a new ticket with updated status (immutable update)
        final oldTicket = _tickets[index];
        final updatedTicket = Ticket(
          id: oldTicket.id,
          title: oldTicket.title,
          description: oldTicket.description,
          status: status,
          priority: oldTicket.priority,
          userId: oldTicket.userId,
          assignedTo: oldTicket.assignedTo,
          createdAt: oldTicket.createdAt,
          updatedAt: DateTime.now(),
          messages: oldTicket.messages,
          attachments: oldTicket.attachments,
        );
        _tickets[index] = updatedTicket;
      }
    } catch (e) {
      _error = e.toString();
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> addMessage(String ticketId, String content, {bool isInternal = false}) async {
    _isLoading = true;
    notifyListeners();

    try {
      // TODO: Implement actual HTTP call to your backend
      await Future.delayed(const Duration(milliseconds: 500));
      
      final index = _tickets.indexWhere((t) => t.id == ticketId);
      if (index != -1) {
        final oldTicket = _tickets[index];
        final newMessage = Message(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          ticketId: ticketId,
          userId: 'current_user',
          content: content,
          isInternal: isInternal,
          createdAt: DateTime.now(),
        );
        
        final updatedMessages = [...oldTicket.messages, newMessage];
        
        final updatedTicket = Ticket(
          id: oldTicket.id,
          title: oldTicket.title,
          description: oldTicket.description,
          status: oldTicket.status,
          priority: oldTicket.priority,
          userId: oldTicket.userId,
          assignedTo: oldTicket.assignedTo,
          createdAt: oldTicket.createdAt,
          updatedAt: DateTime.now(),
          messages: updatedMessages,
          attachments: oldTicket.attachments,
        );
        _tickets[index] = updatedTicket;
      }
    } catch (e) {
      _error = e.toString();
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Ticket? getTicketById(String ticketId) {
    try {
      return _tickets.firstWhere((t) => t.id == ticketId);
    } catch (e) {
      return null;
    }
  }

  List<Ticket> getTicketsByStatus(String status) {
    return _tickets.where((t) => t.status.toLowerCase() == status.toLowerCase()).toList();
  }

  List<Ticket> getMyTickets(String userId) {
    return _tickets.where((t) => t.userId == userId).toList();
  }
}
