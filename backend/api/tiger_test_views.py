"""API views for Tiger Test (محاكي اختبار النمر)."""
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone

from .models import TigerTestSession
from .permissions import IsAuthenticatedDeviceAllowed
from . import tiger_test as tt


def _abandon_active_sessions(user):
    """Mark any in-progress sessions as completed so a new one can start quickly."""
    now = timezone.now()
    TigerTestSession.objects.filter(
        user=user,
        status__in=[
            TigerTestSession.STATUS_IN_SECTION,
            TigerTestSession.STATUS_BETWEEN_SECTIONS,
        ],
    ).update(
        status=TigerTestSession.STATUS_COMPLETED,
        completed_at=now,
        results={
            "verbal_correct": 0,
            "verbal_total": 0,
            "verbal_percentage": 0,
            "quant_correct": 0,
            "quant_total": 0,
            "quant_percentage": 0,
            "final_percentage": 0,
            "abandoned": True,
        },
    )


class TigerTestActiveView(APIView):
    permission_classes = [IsAuthenticatedDeviceAllowed]

    def get(self, request):
        session = (
            TigerTestSession.objects.filter(
                user=request.user,
                status__in=[
                    TigerTestSession.STATUS_IN_SECTION,
                    TigerTestSession.STATUS_BETWEEN_SECTIONS,
                ],
            )
            .order_by("-created_at")
            .first()
        )
        if not session:
            return Response({"session": None})
        return Response({"session": tt.session_to_payload(session)})


class TigerTestStartView(APIView):
    permission_classes = [IsAuthenticatedDeviceAllowed]

    def post(self, request):
        force = bool(
            (request.data or {}).get("force")
            or (request.data or {}).get("restart")
        )

        active = TigerTestSession.objects.filter(
            user=request.user,
            status__in=[
                TigerTestSession.STATUS_IN_SECTION,
                TigerTestSession.STATUS_BETWEEN_SECTIONS,
            ],
        ).first()

        if active and not force:
            return Response(
                {"session": tt.session_to_payload(active)},
                status=status.HTTP_200_OK,
            )

        if active and force:
            _abandon_active_sessions(request.user)

        try:
            sections, pool_warnings = tt.build_sections_for_user(request.user)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        tt.mark_questions_used(request.user, sections)

        session = TigerTestSession.objects.create(
            user=request.user,
            status=TigerTestSession.STATUS_IN_SECTION,
            current_section=1,
            current_question_index=0,
            section_time_remaining=tt.SECTION_SECONDS,
            section_started_at=timezone.now(),
            section_slots=sections,
            answers={},
            bookmarked=[],
            deferred=[],
            seen=[],
            pool_warnings=pool_warnings,
        )
        return Response(
            {"session": tt.session_to_payload(session)},
            status=status.HTTP_201_CREATED,
        )


class TigerTestAbandonView(APIView):
    """Abandon the current active tiger test so the student can start fresh."""

    permission_classes = [IsAuthenticatedDeviceAllowed]

    def post(self, request):
        _abandon_active_sessions(request.user)
        return Response({"ok": True})


class TigerTestHistoryView(APIView):
    """List completed Tiger Test attempts for the current student."""

    permission_classes = [IsAuthenticatedDeviceAllowed]

    def get(self, request):
        sessions = TigerTestSession.objects.filter(
            user=request.user,
            status=TigerTestSession.STATUS_COMPLETED,
        ).order_by("-completed_at", "-created_at")[:50]

        attempts = []
        for session in sessions:
            results = session.results or {}
            if results.get("abandoned"):
                continue
            try:
                final_pct = int(round(float(results.get("final_percentage") or 0)))
            except (TypeError, ValueError):
                final_pct = 0
            attempts.append(
                {
                    "id": str(session.id),
                    "created_at": (
                        session.created_at.isoformat() if session.created_at else None
                    ),
                    "completed_at": (
                        session.completed_at.isoformat()
                        if session.completed_at
                        else None
                    ),
                    "verbal_percentage": results.get("verbal_percentage") or 0,
                    "quant_percentage": results.get("quant_percentage") or 0,
                    "final_percentage": final_pct,
                    "verbal_correct": results.get("verbal_correct") or 0,
                    "verbal_total": results.get("verbal_total") or 0,
                    "quant_correct": results.get("quant_correct") or 0,
                    "quant_total": results.get("quant_total") or 0,
                }
            )
        return Response({"attempts": attempts})


class TigerTestSessionView(APIView):
    permission_classes = [IsAuthenticatedDeviceAllowed]

    def _get_session(self, request, session_id):
        try:
            return TigerTestSession.objects.get(id=session_id, user=request.user)
        except TigerTestSession.DoesNotExist:
            return None

    def get(self, request, session_id):
        session = self._get_session(request, session_id)
        if not session:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response({"session": tt.session_to_payload(session)})

    def patch(self, request, session_id):
        session = self._get_session(request, session_id)
        if not session:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if session.status == TigerTestSession.STATUS_COMPLETED:
            return Response({"session": tt.session_to_payload(session)})

        data = request.data or {}
        if "current_question_index" in data:
            try:
                session.current_question_index = max(
                    0, int(data["current_question_index"])
                )
            except (TypeError, ValueError):
                pass
        if "section_time_remaining" in data:
            try:
                session.section_time_remaining = max(
                    0, int(data["section_time_remaining"])
                )
            except (TypeError, ValueError):
                pass
        if "seen" in data and isinstance(data["seen"], list):
            session.seen = data["seen"]
        session.save(
            update_fields=[
                "current_question_index",
                "section_time_remaining",
                "seen",
            ]
        )
        return Response({"session": tt.session_light_state(session)})


class TigerTestAnswerView(APIView):
    permission_classes = [IsAuthenticatedDeviceAllowed]

    def post(self, request, session_id):
        try:
            session = TigerTestSession.objects.get(id=session_id, user=request.user)
        except TigerTestSession.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if session.status != TigerTestSession.STATUS_IN_SECTION:
            return Response(
                {"detail": "Cannot answer outside an active section."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        slot_id = request.data.get("slot_id")
        answer_id = request.data.get("answer_id")
        if not slot_id:
            return Response(
                {"detail": "slot_id is required."}, status=status.HTTP_400_BAD_REQUEST
            )

        answers = dict(session.answers or {})
        if answer_id:
            answers[str(slot_id)] = str(answer_id).lower()[:1]
        elif str(slot_id) in answers:
            del answers[str(slot_id)]
        session.answers = answers

        bookmark = request.data.get("bookmarked")
        if bookmark is not None:
            bookmarked = list(session.bookmarked or [])
            sid = str(slot_id)
            if bookmark and sid not in bookmarked:
                bookmarked.append(sid)
            elif not bookmark and sid in bookmarked:
                bookmarked.remove(sid)
            session.bookmarked = bookmarked

        deferred_flag = request.data.get("deferred")
        if deferred_flag is not None:
            deferred = list(session.deferred or [])
            sid = str(slot_id)
            if deferred_flag and sid not in deferred:
                deferred.append(sid)
            elif not deferred_flag and sid in deferred:
                deferred.remove(sid)
            session.deferred = deferred

        session.save(update_fields=["answers", "bookmarked", "deferred"])
        return Response({"session": tt.session_light_state(session)})


class TigerTestEndSectionView(APIView):
    """End current section (timer expired or user clicked end section)."""

    permission_classes = [IsAuthenticatedDeviceAllowed]

    def post(self, request, session_id):
        try:
            session = TigerTestSession.objects.get(id=session_id, user=request.user)
        except TigerTestSession.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if session.status != TigerTestSession.STATUS_IN_SECTION:
            return Response({"session": tt.session_to_payload(session)})

        n_sections = tt.session_section_count(session)
        session.section_time_remaining = 0

        if session.current_section >= n_sections:
            results = tt.score_session(session)
            session.results = results
            session.status = TigerTestSession.STATUS_COMPLETED
            session.completed_at = timezone.now()
            session.save(
                update_fields=[
                    "section_time_remaining",
                    "results",
                    "status",
                    "completed_at",
                ]
            )
            tt.persist_session_incorrect_answers(request.user, session)
        else:
            session.status = TigerTestSession.STATUS_BETWEEN_SECTIONS
            session.bookmarked = []
            session.deferred = []
            session.save(
                update_fields=[
                    "section_time_remaining",
                    "status",
                    "bookmarked",
                    "deferred",
                ]
            )
        return Response({"session": tt.session_to_payload(session)})


class TigerTestNextSectionView(APIView):
    """Student confirmed ready for next section."""

    permission_classes = [IsAuthenticatedDeviceAllowed]

    def post(self, request, session_id):
        try:
            session = TigerTestSession.objects.get(id=session_id, user=request.user)
        except TigerTestSession.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if session.status != TigerTestSession.STATUS_BETWEEN_SECTIONS:
            # If already completed, just return results payload
            if session.status == TigerTestSession.STATUS_COMPLETED:
                return Response({"session": tt.session_to_payload(session)})
            return Response(
                {"detail": "Not between sections."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        n_sections = tt.session_section_count(session)
        next_section = session.current_section + 1

        if next_section > n_sections:
            results = tt.score_session(session)
            session.results = results
            session.status = TigerTestSession.STATUS_COMPLETED
            session.completed_at = timezone.now()
            session.save(update_fields=["results", "status", "completed_at"])
            tt.persist_session_incorrect_answers(request.user, session)
            return Response({"session": tt.session_to_payload(session)})

        # Skip any accidental empty sections
        sections = session.section_slots or []
        while next_section <= n_sections:
            idx = next_section - 1
            if idx < len(sections) and len(sections[idx]) > 0:
                break
            next_section += 1

        if next_section > n_sections:
            results = tt.score_session(session)
            session.results = results
            session.status = TigerTestSession.STATUS_COMPLETED
            session.completed_at = timezone.now()
            session.save(update_fields=["results", "status", "completed_at"])
            tt.persist_session_incorrect_answers(request.user, session)
            return Response({"session": tt.session_to_payload(session)})

        session.current_section = next_section
        session.current_question_index = 0
        session.section_time_remaining = tt.SECTION_SECONDS
        session.section_started_at = timezone.now()
        session.status = TigerTestSession.STATUS_IN_SECTION
        session.bookmarked = []
        session.deferred = []
        session.seen = []
        session.save(
            update_fields=[
                "current_section",
                "current_question_index",
                "section_time_remaining",
                "section_started_at",
                "status",
                "bookmarked",
                "deferred",
                "seen",
            ]
        )
        return Response({"session": tt.session_to_payload(session)})


class TigerTestReviewView(APIView):
    """Load one completed-section review (avoids building all 120 questions)."""

    permission_classes = [IsAuthenticatedDeviceAllowed]

    def get(self, request, session_id):
        try:
            session = TigerTestSession.objects.get(id=session_id, user=request.user)
        except TigerTestSession.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if session.status != TigerTestSession.STATUS_COMPLETED:
            return Response(
                {"detail": "Test not completed yet."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            section = int(request.query_params.get("section") or 1)
        except (TypeError, ValueError):
            section = 1
        explain = str(request.query_params.get("explain") or "").lower() in (
            "1",
            "true",
            "yes",
        )
        items = tt.build_review_items(
            session,
            section_number=section,
            include_explanation=explain,
        )
        return Response(
            {
                "section": section,
                "section_count": tt.session_section_count(session),
                "items": items,
            }
        )


class TigerTestResultsView(APIView):
    permission_classes = [IsAuthenticatedDeviceAllowed]

    def get(self, request, session_id):
        try:
            session = TigerTestSession.objects.get(id=session_id, user=request.user)
        except TigerTestSession.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if session.status != TigerTestSession.STATUS_COMPLETED:
            return Response(
                {"detail": "Test not completed yet."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            {
                "results": session.results,
                "session": tt.session_to_payload(session, include_review=False),
            }
        )
