import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/ticket_provider.dart';

class CreateTicketScreen extends StatefulWidget {
  const CreateTicketScreen({super.key});

  @override
  State<CreateTicketScreen> createState() => _CreateTicketScreenState();
}

class _CreateTicketScreenState extends State<CreateTicketScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  String _selectedPriority = 'medium';

  final List<Map<String, dynamic>> _priorities = [
    {'value': 'low', 'label': 'Low', 'color': Colors.green},
    {'value': 'medium', 'label': 'Medium', 'color': Colors.blue},
    {'value': 'high', 'label': 'High', 'color': Colors.orange},
    {'value': 'urgent', 'label': 'Urgent', 'color': Colors.red},
  ];

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (_formKey.currentState!.validate()) {
      final ticketProvider = Provider.of<TicketProvider>(context, listen: false);
      
      try {
        await ticketProvider.createTicket(
          title: _titleController.text.trim(),
          description: _descriptionController.text.trim(),
          priority: _selectedPriority,
        );
        
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Ticket created successfully!'),
              backgroundColor: Colors.green,
            ),
          );
          
          // Clear form
          _titleController.clear();
          _descriptionController.clear();
          setState(() => _selectedPriority = 'medium');
          
          // Navigate back
          Navigator.pop(context);
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to create ticket: $e'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.info_outline, color: Colors.blue[300]),
                        const SizedBox(width: 8),
                        Text(
                          'Create New Ticket',
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Fill in the details below to create a support ticket.',
                      style: TextStyle(color: Colors.grey[600]),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            
            // Title Field
            TextFormField(
              controller: _titleController,
              decoration: const InputDecoration(
                labelText: 'Title',
                hintText: 'Brief summary of your issue',
                prefixIcon: Icon(Icons.title),
              ),
              textCapitalization: TextCapitalization.sentences,
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please enter a title';
                }
                if (value.length < 5) {
                  return 'Title must be at least 5 characters';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            
            // Priority Selection
            Text(
              'Priority',
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _priorities.map((priority) {
                final isSelected = _selectedPriority == priority['value'];
                return ChoiceChip(
                  label: Text(priority['label'] as String),
                  selected: isSelected,
                  onSelected: (selected) {
                    if (selected) {
                      setState(() => _selectedPriority = priority['value'] as String);
                    }
                  },
                  avatar: isSelected ? const Icon(Icons.check, size: 18) : null,
                  backgroundColor: (priority['color'] as Color).withOpacity(0.1),
                  selectedColor: (priority['color'] as Color).withOpacity(0.3),
                  labelStyle: TextStyle(
                    color: isSelected ? Colors.white : priority['color'],
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 24),
            
            // Description Field
            TextFormField(
              controller: _descriptionController,
              decoration: const InputDecoration(
                labelText: 'Description',
                hintText: 'Describe your issue in detail',
                prefixIcon: Icon(Icons.description),
                alignLabelWithHint: true,
              ),
              maxLines: 6,
              textCapitalization: TextCapitalization.sentences,
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please enter a description';
                }
                if (value.length < 20) {
                  return 'Description must be at least 20 characters';
                }
                return null;
              },
            ),
            const SizedBox(height: 32),
            
            // Submit Button
            Consumer<TicketProvider>(
              builder: (context, ticketProvider, child) {
                return ElevatedButton(
                  onPressed: ticketProvider.isLoading ? null : _handleSubmit,
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: ticketProvider.isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.send),
                            SizedBox(width: 8),
                            Text(
                              'Submit Ticket',
                              style: TextStyle(fontSize: 16),
                            ),
                          ],
                        ),
                );
              },
            ),
            const SizedBox(height: 16),
            
            // Cancel Button
            OutlinedButton(
              onPressed: () {
                _titleController.clear();
                _descriptionController.clear();
                setState(() => _selectedPriority = 'medium');
              },
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Text('Clear Form'),
            ),
          ],
        ),
      ),
    );
  }
}
