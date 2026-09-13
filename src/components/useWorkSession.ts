"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  createWork,
  duplicateWork,
  migrateDraft,
  readWork,
  readRecoveries,
  readPendingRecoveries,
  rememberPending,
  saveWork,
  type Work,
  type Material,
} from "@/lib/works";
import { getExample } from "@/lib/examples";
import type { Lesson } from "@/lib/lesson";
import { newHistory, recordEdit, redoEdit, undoEdit } from "@/lib/edit-history";
import { decodeLesson } from "@/lib/share";

export function useWorkSession() {
  const current = useRef<Work | null>(null),
    initialized = useRef(false);
  const [work, setWork] = useState<Work | null>(null),
    [ready, setReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState("输入后自动保存"),
    [saveError, setSaveError] = useState("");
  const [loadError, setLoadError] = useState("");
  const history = useRef(newHistory(null));
  const [historyState, setHistoryState] = useState(history.current);
  const unsaved = useRef(false);
  const persist = useCallback((next: Work) => {
    let saved = next;
    try {
      saved = saveWork(window.localStorage, next);
      unsaved.current = false;
      setSaveStatus("已保存到本机");
      setSaveError("");
    } catch (error) {
      unsaved.current = true;
      rememberPending(next);
      setSaveStatus("当前修改尚未保存");
      setSaveError(
        error instanceof Error
          ? error.message
          : "本机存储不可用，请备份素材与作品。",
      );
    }
    if (!unsaved.current) {
      try {
        const url = new URL(window.location.href);
        url.search = new URLSearchParams({ work: saved.id }).toString();
        if (url.href !== window.location.href)
          window.history.replaceState(window.history.state, "", url);
      } catch {
        setSaveStatus("已保存，请从「我的作品」继续");
      }
    }
    current.current = saved;
    setWork(saved);
    return saved;
  }, []);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (window.location.hash.startsWith('#v1.')) {
      void decodeLesson(window.location.hash.slice(1)).then(lesson => {
        const imported = persist(createWork({lesson,mode:'teach'}));
        history.current = newHistory(imported.lesson);
        setHistoryState(history.current);
        if (!unsaved.current) {
          const url = new URL(window.location.href);
          url.hash = '';
          window.history.replaceState(window.history.state, '', url);
          setSaveStatus('已从分享链接保存为独立作品');
        }
      }).catch(error => setLoadError(error instanceof Error ? error.message : '分享作品无法读取'))
        .finally(() => setReady(true));
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const id = params.get("work");
    let initial: Work;
    try {
      migrateDraft(window.localStorage);
    } catch {
      setSaveError("旧草稿暂时无法迁移，本机原数据仍然保留。");
    }
    const recoveryId = params.get("recover");
    if (recoveryId) {
      try {
        const recovered =
          readPendingRecoveries().find((item) => item.id === recoveryId) ||
          readRecoveries(window.localStorage).find(
            (item) => item.id === recoveryId,
          );
        if (!recovered) {
          setLoadError("这条恢复记录暂时无法读取。原作品仍在「我的作品」中。");
          setReady(true);
          return;
        }
        initial = persist(
          createWork({
            lesson: recovered.work.lesson,
            material: recovered.work.material,
            mode: recovered.work.mode,
          }),
        );
        if (!unsaved.current) setSaveStatus("已恢复为独立作品");
      } catch {
        setLoadError("恢复记录暂时无法读取。");
        setReady(true);
        return;
      }
    } else if (id) {
      try {
        const restored = readWork(window.localStorage, id);
        if (!restored) {
          setLoadError("这份作品不在当前浏览器中，或本机数据暂时无法读取。");
          setReady(true);
          return;
        }
        initial = restored;
        setSaveStatus("已恢复本机作品");
      } catch {
        setLoadError(
          "浏览器暂不允许读取本机作品。可从备份导入，或打开分享链接阅读。",
        );
        setReady(true);
        return;
      }
    } else {
      initial = createWork({
        mode: params.get("mode") === "learn" ? "learn" : "teach",
        lesson: getExample(params.get("example")),
      });
      if (initial.lesson) initial = persist(initial);
    }
    current.current = initial;
    setWork(initial);
    history.current = newHistory(initial.lesson);
    setHistoryState(history.current);
    setReady(true);
  }, [persist]);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (unsaved.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const beforeNavigate = (event: MouseEvent) => {
      if (!unsaved.current || !(event.target instanceof Element)) return;
      const link = event.target.closest("a");
      if (
        !link ||
        link.target === "_blank" ||
        link.hasAttribute("download") ||
        link.href.startsWith("blob:") ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      )
        return;
      if (
        !window.confirm(
          "当前修改尚未保存。建议先取消并下载备份，再离开。仍要离开吗？",
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
      } else unsaved.current = false;
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", beforeNavigate, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", beforeNavigate, true);
    };
  }, []);
  const updateMaterial = useCallback(
    (material: Material) => {
      if (current.current) persist({ ...current.current, material });
    },
    [persist],
  );
  const changeMode = useCallback(
    (mode: Work["mode"]) => {
      if (current.current) persist({ ...current.current, mode });
    },
    [persist],
  );
  const edit = useCallback(
    (lesson: Lesson, group = "") => {
      if (!current.current) return;
      history.current = recordEdit(history.current, lesson, group);
      setHistoryState(history.current);
      persist({ ...current.current, lesson });
    },
    [persist],
  );
  const travel = useCallback(
    (direction: "undo" | "redo") => {
      if (!current.current) return;
      history.current =
        direction === "undo"
          ? undoEdit(history.current)
          : redoEdit(history.current);
      setHistoryState(history.current);
      persist({ ...current.current, lesson: history.current.present });
      return history.current.present;
    },
    [persist],
  );
  const open = useCallback(
    (next: Work, preserveCurrent = false) => {
      if (
        unsaved.current &&
        !preserveCurrent &&
        !window.confirm(
          "当前修改尚未保存。建议先取消并下载备份，再切换作品。仍要切换吗？",
        )
      )
        return null;
      history.current = newHistory(next.lesson);
      setHistoryState(history.current);
      return persist(next);
    },
    [persist],
  );
  const duplicate = useCallback(
    () => (current.current ? open(duplicateWork(current.current), true) : null),
    [open],
  );
  return {
    work,
    ready,
    saveStatus,
    saveError,
    loadError,
    updateMaterial,
    changeMode,
    edit,
    travel,
    open,
    duplicate,
    canUndo: historyState.past.length > 0,
    canRedo: historyState.future.length > 0,
  };
}
