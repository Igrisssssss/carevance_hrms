<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ChatApiFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_direct_and_group_chat_flows_cover_unread_typing_and_access_controls(): void
    {
        $primaryOrg = Organization::create([
            'name' => 'Primary Org',
            'slug' => 'primary-org',
        ]);

        $otherOrg = Organization::create([
            'name' => 'Other Org',
            'slug' => 'other-org',
        ]);

        $admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin.chat@example.com',
            'password' => Hash::make('password123'),
            'role' => 'admin',
            'organization_id' => $primaryOrg->id,
        ]);

        $employee = User::create([
            'name' => 'Employee User',
            'email' => 'employee.chat@example.com',
            'password' => Hash::make('password123'),
            'role' => 'employee',
            'organization_id' => $primaryOrg->id,
        ]);

        $outsider = User::create([
            'name' => 'Outsider User',
            'email' => 'outsider.chat@example.com',
            'password' => Hash::make('password123'),
            'role' => 'employee',
            'organization_id' => $otherOrg->id,
        ]);

        $adminHeaders = $this->apiHeadersFor($admin);
        $employeeHeaders = $this->apiHeadersFor($employee);
        $outsiderHeaders = $this->apiHeadersFor($outsider);

        $conversationResponse = $this->postJson('/api/chat/conversations', [
            'email' => $employee->email,
        ], $adminHeaders)
            ->assertCreated()
            ->assertJsonPath('other_user.id', $employee->id);

        $conversationId = (int) $conversationResponse->json('id');
        $this->assertGreaterThan(0, $conversationId);

        $this->postJson("/api/chat/conversations/{$conversationId}/messages", [
            'body' => 'Daily sync complete',
        ], $adminHeaders)
            ->assertCreated()
            ->assertJsonPath('body', 'Daily sync complete')
            ->assertJsonPath('sender.id', $admin->id);

        $this->getJson('/api/chat/unread-summary', $employeeHeaders)
            ->assertOk()
            ->assertJson([
                'unread_messages' => 1,
                'unread_conversations' => 1,
                'unread_senders' => 1,
            ]);

        $this->getJson("/api/chat/conversations/{$conversationId}/messages", $employeeHeaders)
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.body', 'Daily sync complete');

        $this->postJson("/api/chat/conversations/{$conversationId}/typing", [
            'is_typing' => true,
        ], $employeeHeaders)->assertOk();

        $this->getJson("/api/chat/conversations/{$conversationId}/typing", $adminHeaders)
            ->assertOk()
            ->assertJsonFragment([
                'id' => $employee->id,
                'email' => $employee->email,
            ]);

        $this->postJson("/api/chat/conversations/{$conversationId}/read", [], $employeeHeaders)
            ->assertOk();

        $this->getJson('/api/chat/unread-summary', $employeeHeaders)
            ->assertOk()
            ->assertJson([
                'unread_messages' => 0,
                'unread_conversations' => 0,
                'unread_senders' => 0,
            ]);

        $this->postJson("/api/chat/conversations/{$conversationId}/messages", [
            'body' => 'This should fail',
        ], $outsiderHeaders)->assertNotFound();

        $groupResponse = $this->postJson('/api/chat/groups', [
            'name' => 'Ops Team',
            'user_ids' => [$employee->id],
        ], $adminHeaders)->assertCreated();

        $groupId = (int) $groupResponse->json('id');
        $this->assertGreaterThan(0, $groupId);

        $this->postJson("/api/chat/groups/{$groupId}/messages", [
            'body' => 'Group update',
        ], $adminHeaders)->assertCreated();

        $this->getJson('/api/chat/unread-summary', $employeeHeaders)
            ->assertOk()
            ->assertJson([
                'unread_messages' => 1,
                'unread_conversations' => 1,
                'unread_senders' => 1,
            ]);

        $this->postJson("/api/chat/groups/{$groupId}/read", [], $employeeHeaders)
            ->assertOk();

        $this->getJson('/api/chat/unread-summary', $employeeHeaders)
            ->assertOk()
            ->assertJson([
                'unread_messages' => 0,
                'unread_conversations' => 0,
                'unread_senders' => 0,
            ]);

        $this->getJson('/api/chat/groups', $employeeHeaders)
            ->assertOk()
            ->assertJsonPath('0.id', $groupId)
            ->assertJsonPath('0.member_count', 2);

        $this->postJson('/api/chat/groups', [
            'name' => 'Invalid Group',
            'user_ids' => [$outsider->id],
        ], $adminHeaders)
            ->assertStatus(422)
            ->assertJsonPath('message', 'All group members must belong to your organization.');
    }

    public function test_message_requires_body_or_attachment(): void
    {
        $organization = Organization::create([
            'name' => 'Chat Validation Org',
            'slug' => 'chat-validation-org',
        ]);

        $sender = User::create([
            'name' => 'Sender',
            'email' => 'sender.chat@example.com',
            'password' => Hash::make('password123'),
            'role' => 'admin',
            'organization_id' => $organization->id,
        ]);

        $receiver = User::create([
            'name' => 'Receiver',
            'email' => 'receiver.chat@example.com',
            'password' => Hash::make('password123'),
            'role' => 'employee',
            'organization_id' => $organization->id,
        ]);

        $senderHeaders = $this->apiHeadersFor($sender);

        $conversationId = (int) $this->postJson('/api/chat/conversations', [
            'email' => $receiver->email,
        ], $senderHeaders)
            ->assertCreated()
            ->json('id');

        $this->postJson("/api/chat/conversations/{$conversationId}/messages", [
            'body' => '   ',
        ], $senderHeaders)
            ->assertStatus(422)
            ->assertJsonPath('message', 'Message or attachment is required.');
    }
}

