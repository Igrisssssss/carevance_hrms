<?php

namespace Tests\Feature;

use App\Models\Group;
use App\Models\Organization;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class GroupTaskAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_employee_only_receives_tasks_from_allowed_groups_and_assignments(): void
    {
        $organization = Organization::create(['name' => 'CareVance', 'slug' => 'carevance']);

        $admin = $this->createUser($organization, 'Admin', 'admin@carevance.test', 'admin');
        $employee = $this->createUser($organization, 'Digital Employee', 'digital@carevance.test', 'employee');
        $otherEmployee = $this->createUser($organization, 'IT Employee', 'it@carevance.test', 'employee');

        $digitalGroup = $this->createGroup($organization, 'Digital Marketing');
        $itGroup = $this->createGroup($organization, 'IT');

        $employee->groups()->attach($digitalGroup->id);
        $otherEmployee->groups()->attach($itGroup->id);

        $visibleTask = Task::create([
            'group_id' => $digitalGroup->id,
            'title' => 'Plan campaign assets',
            'status' => 'todo',
            'priority' => 'medium',
            'assignee_id' => $employee->id,
        ]);

        $unassignedGroupTask = Task::create([
            'group_id' => $digitalGroup->id,
            'title' => 'Review landing page copy',
            'status' => 'todo',
            'priority' => 'medium',
            'assignee_id' => null,
        ]);

        $sameGroupButOtherAssignee = Task::create([
            'group_id' => $digitalGroup->id,
            'title' => 'Schedule newsletter send',
            'status' => 'todo',
            'priority' => 'medium',
            'assignee_id' => $admin->id,
        ]);

        $crossGroupTask = Task::create([
            'group_id' => $itGroup->id,
            'title' => 'Rotate API keys',
            'status' => 'todo',
            'priority' => 'high',
            'assignee_id' => $otherEmployee->id,
        ]);

        $response = $this->getJson('/api/tasks', $this->apiHeadersFor($employee))
            ->assertOk();

        $this->assertSame([$visibleTask->id, $unassignedGroupTask->id], collect($response->json())
            ->pluck('id')
            ->sort()
            ->values()
            ->all());

        $this->getJson("/api/tasks/{$visibleTask->id}", $this->apiHeadersFor($employee))
            ->assertOk()
            ->assertJsonPath('group.id', $digitalGroup->id);

        $this->getJson("/api/tasks/{$sameGroupButOtherAssignee->id}", $this->apiHeadersFor($employee))
            ->assertForbidden();

        $this->getJson("/api/tasks/{$crossGroupTask->id}", $this->apiHeadersFor($employee))
            ->assertForbidden();
    }

    public function test_manager_can_create_tasks_only_for_managed_groups(): void
    {
        $organization = Organization::create(['name' => 'CareVance', 'slug' => 'carevance']);

        $manager = $this->createUser($organization, 'Group Manager', 'manager@carevance.test', 'manager');
        $employee = $this->createUser($organization, 'Digital Employee', 'digital@carevance.test', 'employee');

        $digitalGroup = $this->createGroup($organization, 'Digital Marketing');
        $itGroup = $this->createGroup($organization, 'IT');

        $manager->groups()->attach($digitalGroup->id);
        $employee->groups()->attach($digitalGroup->id);

        $headers = $this->apiHeadersFor($manager);

        $this->postJson('/api/tasks', [
            'group_id' => $digitalGroup->id,
            'title' => 'Prepare social media calendar',
            'priority' => 'medium',
            'assignee_id' => $employee->id,
        ], $headers)
            ->assertCreated()
            ->assertJsonPath('group.id', $digitalGroup->id)
            ->assertJsonPath('assignee.id', $employee->id);

        $this->postJson('/api/tasks', [
            'group_id' => $itGroup->id,
            'title' => 'Provision a new laptop',
            'priority' => 'medium',
        ], $headers)
            ->assertForbidden();
    }

    public function test_task_assignment_is_rejected_when_user_is_not_in_the_selected_group(): void
    {
        $organization = Organization::create(['name' => 'CareVance', 'slug' => 'carevance']);

        $admin = $this->createUser($organization, 'Admin', 'admin@carevance.test', 'admin');
        $digitalEmployee = $this->createUser($organization, 'Digital Employee', 'digital@carevance.test', 'employee');
        $itEmployee = $this->createUser($organization, 'IT Employee', 'it@carevance.test', 'employee');

        $digitalGroup = $this->createGroup($organization, 'Digital Marketing');
        $itGroup = $this->createGroup($organization, 'IT');

        $digitalEmployee->groups()->attach($digitalGroup->id);
        $itEmployee->groups()->attach($itGroup->id);

        $this->postJson('/api/tasks', [
            'group_id' => $digitalGroup->id,
            'title' => 'Draft paid ads brief',
            'priority' => 'high',
            'assignee_id' => $itEmployee->id,
        ], $this->apiHeadersFor($admin))
            ->assertStatus(422)
            ->assertJsonValidationErrors('assignee_id')
            ->assertJsonPath('errors.assignee_id.0', 'Assigned user must belong to the selected group.');
    }

    public function test_timer_only_query_accepts_true_string_and_filters_done_tasks(): void
    {
        $organization = Organization::create(['name' => 'CareVance', 'slug' => 'carevance']);

        $employee = $this->createUser($organization, 'Timer Employee', 'timer@carevance.test', 'employee');
        $group = $this->createGroup($organization, 'IT');
        $employee->groups()->attach($group->id);

        $todoTask = Task::create([
            'group_id' => $group->id,
            'title' => 'Keep alive check',
            'status' => 'todo',
            'priority' => 'medium',
            'assignee_id' => null,
        ]);

        Task::create([
            'group_id' => $group->id,
            'title' => 'Completed maintenance',
            'status' => 'done',
            'priority' => 'medium',
            'assignee_id' => null,
        ]);

        $response = $this->getJson('/api/tasks?timer_only=true', $this->apiHeadersFor($employee))
            ->assertOk();

        $this->assertSame([$todoTask->id], collect($response->json())
            ->pluck('id')
            ->values()
            ->all());
    }

    private function createUser(Organization $organization, string $name, string $email, string $role): User
    {
        return User::create([
            'name' => $name,
            'email' => $email,
            'password' => Hash::make('password123'),
            'role' => $role,
            'organization_id' => $organization->id,
        ]);
    }

    private function createGroup(Organization $organization, string $name): Group
    {
        return Group::create([
            'organization_id' => $organization->id,
            'name' => $name,
            'slug' => str($name)->slug()->toString(),
            'is_active' => true,
        ]);
    }
}
