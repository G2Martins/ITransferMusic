package com.projeto.ITransferMusic.utils;

import java.util.List;

public class CastUtils {

    @SuppressWarnings("unchecked")
    public static <T> T safeCast(Object obj, Class<T> clazz) {
        if (clazz.isInstance(obj)) {
            return (T) obj;
        } else {
            throw new ClassCastException("Objeto não é do tipo " + clazz.getName());
        }
    }

    @SuppressWarnings("unchecked")
    public static <T> List<T> safeCastToList(Object obj, Class<T> clazz) {
        if (obj instanceof List) {
            for (Object item : (List<?>) obj) {
                if (!clazz.isInstance(item)) {
                    throw new ClassCastException("Item não é do tipo " + clazz.getName());
                }
            }
            return (List<T>) obj;
        }
        throw new ClassCastException("Objeto não é uma lista");
    }
}
