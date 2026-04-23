package com.example.backend.dto.request;

import com.example.backend.enums.Role;
import jakarta.validation.constraints.NotNull;

public class AdminUpdateUserRoleRequest {

    @NotNull(message = "Role is required")
    private Role role;

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }
}
