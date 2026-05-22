package com.vector.onboarding.domain.dataview;

import com.vector.onboarding.domain.dataview.service.DataViewService;
import com.vector.onboarding.domain.space.SpaceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/spaces/{spaceId}/data-view")
@RequiredArgsConstructor
public class DataViewController {

    private final DataViewService dataViewService;
    private final SpaceService spaceService;

    @GetMapping(value = "/schema", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> getSchema(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long spaceId) {
            
        Long requestUserId = Long.valueOf(userDetails.getUsername());
        spaceService.checkSpaceMembership(requestUserId, spaceId);

        String schemaJson = dataViewService.getOrAnalyzeSchema(spaceId);
        return ResponseEntity.ok(schemaJson);
    }
}
