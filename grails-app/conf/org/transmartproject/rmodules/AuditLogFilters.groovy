package org.transmartproject.rmodules

import org.transmartproject.core.users.User

class AuditLogFilters {

    def auditLogService
    def studyIdService // resides in transmartApp
    User currentUserBean

    def filters = {
        chart(controller: 'RModules', action: 'scheduleJob') {
            before = { model ->
                def analysis = params.analysis ?: ''
                def result_instance_id1 = params.result_instance_id1 ?: ''
                def result_instance_id2 = params.result_instance_id2 ?: ''
                def studies = studyIdService.getStudyIdsForQueries([result_instance_id1, result_instance_id2])
                def task = "Advanced Workflow - ${analysis}"
                auditLogService.report(task, request,
                        study: studies,
                        user: currentUserBean,
                        subset1: result_instance_id1,
                        subset2: result_instance_id2,
                        analysis: analysis,
                )
            }
        }
    }

}
