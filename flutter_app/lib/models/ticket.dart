import 'package:flutter/material.dart';

class Ticket {
  final String id;
  final String title;
  final String description;
  final String status; // open, in_progress, resolved, closed
  final String priority; // low, medium, high, urgent
  final String userId;
  final String? assignedTo;
  final DateTime createdAt;
  final DateTime updatedAt;
  final List<Message> messages;
  final List<Attachment> attachments;

  Ticket({
    required this.id,
    required this.title,
    required this.description,
    required this.status,
    required this.priority,
    required this.userId,
    this.assignedTo,
    required this.createdAt,
    required this.updatedAt,
    this.messages = const [],
    this.attachments = const [],
  });

  factory Ticket.fromJson(Map<String, dynamic> json) {
    return Ticket(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      status: json['status'] ?? 'open',
      priority: json['priority'] ?? 'medium',
      userId: json['user_id'] ?? '',
      assignedTo: json['assigned_to'],
      createdAt: DateTime.parse(json['created_at']),
      updatedAt: DateTime.parse(json['updated_at']),
      messages: (json['messages'] as List?)?.map((m) => Message.fromJson(m)).toList() ?? [],
      attachments: (json['attachments'] as List?)?.map((a) => Attachment.fromJson(a)).toList() ?? [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'status': status,
      'priority': priority,
      'user_id': userId,
      'assigned_to': assignedTo,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
      'messages': messages.map((m) => m.toJson()).toList(),
      'attachments': attachments.map((a) => a.toJson()).toList(),
    };
  }

  Color getStatusColor() {
    switch (status.toLowerCase()) {
      case 'open':
        return Colors.blue;
      case 'in_progress':
        return Colors.orange;
      case 'resolved':
        return Colors.green;
      case 'closed':
        return Colors.grey;
      default:
        return Colors.blue;
    }
  }

  Color getPriorityColor() {
    switch (priority.toLowerCase()) {
      case 'low':
        return Colors.green;
      case 'medium':
        return Colors.blue;
      case 'high':
        return Colors.orange;
      case 'urgent':
        return Colors.red;
      default:
        return Colors.blue;
    }
  }
}

class Message {
  final String id;
  final String ticketId;
  final String userId;
  final String content;
  final bool isInternal;
  final DateTime createdAt;

  Message({
    required this.id,
    required this.ticketId,
    required this.userId,
    required this.content,
    this.isInternal = false,
    required this.createdAt,
  });

  factory Message.fromJson(Map<String, dynamic> json) {
    return Message(
      id: json['id'] ?? '',
      ticketId: json['ticket_id'] ?? '',
      userId: json['user_id'] ?? '',
      content: json['content'] ?? '',
      isInternal: json['is_internal'] ?? false,
      createdAt: DateTime.parse(json['created_at']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'ticket_id': ticketId,
      'user_id': userId,
      'content': content,
      'is_internal': isInternal,
      'created_at': createdAt.toIso8601String(),
    };
  }
}

class Attachment {
  final String id;
  final String ticketId;
  final String fileName;
  final String filePath;
  final String fileType;
  final int fileSize;
  final DateTime uploadedAt;

  Attachment({
    required this.id,
    required this.ticketId,
    required this.fileName,
    required this.filePath,
    required this.fileType,
    required this.fileSize,
    required this.uploadedAt,
  });

  factory Attachment.fromJson(Map<String, dynamic> json) {
    return Attachment(
      id: json['id'] ?? '',
      ticketId: json['ticket_id'] ?? '',
      fileName: json['file_name'] ?? '',
      filePath: json['file_path'] ?? '',
      fileType: json['file_type'] ?? '',
      fileSize: json['file_size'] ?? 0,
      uploadedAt: DateTime.parse(json['uploaded_at']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'ticket_id': ticketId,
      'file_name': fileName,
      'file_path': filePath,
      'file_type': fileType,
      'file_size': fileSize,
      'uploaded_at': uploadedAt.toIso8601String(),
    };
  }
}
